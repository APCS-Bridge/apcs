/**
 * Chat controller - HTTP handlers for chat room and messaging functionality
 */
import type { Request, Response } from 'express';
import prisma from '../lib/prisma';

// Import Socket.IO instance (will be set from server.ts)
let io: any;
export function setSocketIO(socketIO: any) {
  io = socketIO;
}

/**
 * Create a new chat room (direct or group)
 * POST /api/chat/rooms
 * Body: { userIds: string[], name?: string, isGroup?: boolean }
 * Auth: Required
 */
export async function createRoom(req: Request, res: Response) {
  try {
    const currentUserId = req.user!.userId;
    const { userIds, name, isGroup = false } = req.body;

    // Validate input
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one user ID is required'
      });
    }

    // For direct chats, only allow 1 other user
    if (!isGroup && userIds.length !== 1) {
      return res.status(400).json({
        success: false,
        message: 'Direct chats must have exactly one other user'
      });
    }

    // Verify all users exist
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } }
    });

    if (users.length !== userIds.length) {
      return res.status(404).json({
        success: false,
        message: 'One or more users not found'
      });
    }

    // For direct chats, check if room already exists
    if (!isGroup) {
      const existingRoom = await prisma.room.findFirst({
        where: {
          isGroup: false,
          members: {
            every: {
              userId: { in: [currentUserId, userIds[0]] }
            }
          }
        },
        include: {
          members: {
            select: {
              userId: true
            }
          }
        }
      });

      // Check if the room has exactly 2 members (current user + the other user)
      if (existingRoom && existingRoom.members.length === 2) {
        const memberIds = existingRoom.members.map(m => m.userId);
        if (memberIds.includes(currentUserId) && memberIds.includes(userIds[0])) {
          return res.status(200).json({
            success: true,
            message: 'Direct chat room already exists',
            data: existingRoom
          });
        }
      }
    }

    // Create the room with members (including current user)
    const allMemberIds = [currentUserId, ...userIds];
    const uniqueMemberIds = [...new Set(allMemberIds)]; // Remove duplicates

    const room = await prisma.room.create({
      data: {
        name: isGroup ? name : null,
        isGroup,
        members: {
          create: uniqueMemberIds.map(userId => ({
            userId
          }))
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Chat room created successfully',
      data: room
    });
  } catch (error) {
    console.error('Create room error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Get all rooms for current user
 * GET /api/chat/rooms
 * Auth: Required
 */
export async function getUserRooms(req: Request, res: Response) {
  try {
    const currentUserId = req.user!.userId;

    const rooms = await prisma.room.findMany({
      where: {
        members: {
          some: {
            userId: currentUserId
          }
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        messages: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // For direct chats, set the name to the other user's name
    const roomsWithNames = rooms.map(room => {
      if (!room.isGroup && !room.name) {
        const otherMember = room.members.find(m => m.userId !== currentUserId);
        return {
          ...room,
          name: otherMember?.user.name || 'Unknown User'
        };
      }
      return room;
    });

    return res.status(200).json({
      success: true,
      data: roomsWithNames
    });
  } catch (error) {
    console.error('Get user rooms error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Get room details by ID (only if user is a member)
 * GET /api/chat/rooms/:roomId
 * Auth: Required
 */
export async function getRoomById(req: Request, res: Response) {
  try {
    const currentUserId = req.user!.userId;
    const { roomId } = req.params;

    if (!roomId) {
      return res.status(400).json({
        success: false,
        message: 'Room ID is required'
      });
    }

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Check if user is a member
    const isMember = room.members.some((m: any) => m.userId === currentUserId);
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not a member of this room.'
      });
    }

    return res.status(200).json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error('Get room by ID error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Get messages in a room (with pagination)
 * GET /api/chat/rooms/:roomId/messages?limit=50&before=<messageId>
 * Auth: Required
 */
export async function getRoomMessages(req: Request, res: Response) {
  try {
    const currentUserId = req.user!.userId;
    const { roomId } = req.params;
    const { limit = '50', before } = req.query;

    if (!roomId) {
      return res.status(400).json({
        success: false,
        message: 'Room ID is required'
      });
    }

    // Check if user is a member of the room
    const isMember = await prisma.roomMember.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId: currentUserId
        }
      }
    });

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not a member of this room.'
      });
    }

    // Build where clause for pagination
    const whereClause: any = { roomId };
    
    if (before && typeof before === 'string') {
      // Get messages before a specific message (for pagination)
      const beforeMessage = await prisma.message.findUnique({
        where: { id: before }
      });
      
      if (beforeMessage) {
        whereClause.createdAt = {
          lt: beforeMessage.createdAt
        };
      }
    }

    const messages = await prisma.message.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc'
      },
      take: parseInt(limit as string),
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return res.status(200).json({
      success: true,
      data: messages.reverse() // Return in chronological order
    });
  } catch (error) {
    console.error('Get room messages error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Send a message in a room
 * POST /api/chat/rooms/:roomId/messages
 * Body: { content: string }
 * Auth: Required
 */
export async function sendMessage(req: Request, res: Response) {
  try {
    const currentUserId = req.user!.userId;
    const { roomId } = req.params;
    const { content } = req.body;

    if (!roomId) {
      return res.status(400).json({
        success: false,
        message: 'Room ID is required'
      });
    }

    // Validate input
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required'
      });
    }

    // Check if user is a member of the room
    const isMember = await prisma.roomMember.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId: currentUserId
        }
      }
    });

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not a member of this room.'
      });
    }

    // Create message and update room's updatedAt
    const message = await prisma.$transaction(async (tx) => {
      const newMessage = await tx.message.create({
        data: {
          roomId,
          senderId: currentUserId,
          content: content.trim()
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      // Update room's updatedAt timestamp
      await tx.room.update({
        where: { id: roomId },
        data: { updatedAt: new Date() }
      });

      return newMessage;
    });

    // Emit Socket.IO event to all users in the room (if Socket.IO is initialized)
    if (io) {
      io.to(`room:${roomId}`).emit('chat:new-message', message);
    }

    return res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: message
    });
  } catch (error) {
    console.error('Send message error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Add members to a group chat room
 * POST /api/chat/rooms/:roomId/members
 * Body: { userIds: string[] }
 * Auth: Required (must be existing member)
 */
export async function addRoomMembers(req: Request, res: Response) {
  try {
    const currentUserId = req.user!.userId;
    const { roomId } = req.params;
    const { userIds } = req.body;

    if (!roomId) {
      return res.status(400).json({
        success: false,
        message: 'Room ID is required'
      });
    }

    // Validate input
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one user ID is required'
      });
    }

    // Check if room exists and is a group chat
    const room = await prisma.room.findUnique({
      where: { id: roomId }
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    if (!room.isGroup) {
      return res.status(400).json({
        success: false,
        message: 'Cannot add members to direct chat rooms'
      });
    }

    // Check if current user is a member
    const isMember = await prisma.roomMember.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId: currentUserId
        }
      }
    });

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not a member of this room.'
      });
    }

    // Verify all users exist
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } }
    });

    if (users.length !== userIds.length) {
      return res.status(404).json({
        success: false,
        message: 'One or more users not found'
      });
    }

    // Add new members (ignore if already exists)
    const newMembers = await prisma.$transaction(
      userIds.map(userId =>
        prisma.roomMember.upsert({
          where: {
            roomId_userId: {
              roomId,
              userId
            }
          },
          update: {},
          create: {
            roomId,
            userId
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        })
      )
    );

    return res.status(200).json({
      success: true,
      message: 'Members added successfully',
      data: newMembers
    });
  } catch (error) {
    console.error('Add room members error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Leave a room
 * DELETE /api/chat/rooms/:roomId/leave
 * Auth: Required
 */
export async function leaveRoom(req: Request, res: Response) {
  try {
    const currentUserId = req.user!.userId;
    const { roomId } = req.params;

    if (!roomId) {
      return res.status(400).json({
        success: false,
        message: 'Room ID is required'
      });
    }

    // Check if user is a member
    const membership = await prisma.roomMember.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId: currentUserId
        }
      }
    });

    if (!membership) {
      return res.status(404).json({
        success: false,
        message: 'You are not a member of this room'
      });
    }

    // Remove membership
    await prisma.roomMember.delete({
      where: {
        roomId_userId: {
          roomId,
          userId: currentUserId
        }
      }
    });

    // Check if room is empty and delete if so
    const remainingMembers = await prisma.roomMember.count({
      where: { roomId }
    });

    if (remainingMembers === 0) {
      await prisma.room.delete({
        where: { id: roomId }
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Left room successfully'
    });
  } catch (error) {
    console.error('Leave room error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}
