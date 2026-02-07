/**
 * Socket.IO event handlers for chat functionality
 */
import type { Server as SocketIOServer } from 'socket.io';
import type { AuthenticatedSocket } from '../lib/socket';
import prisma from '../lib/prisma';

export function setupChatHandlers(io: SocketIOServer) {
  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userId;

    if (!userId) {
      socket.disconnect();
      return;
    }

    /**
     * Join a chat room
     * Client emits: { roomId: string }
     */
    socket.on('chat:join-room', async (data: { roomId: string }) => {
      try {
        const { roomId } = data;

        // Verify user is a member of this room
        const membership = await prisma.roomMember.findUnique({
          where: {
            roomId_userId: {
              roomId,
              userId
            }
          }
        });

        if (!membership) {
          socket.emit('chat:error', {
            message: 'You are not a member of this room'
          });
          return;
        }

        // Join the Socket.IO room
        socket.join(`room:${roomId}`);
        
        socket.emit('chat:joined-room', {
          roomId,
          message: 'Successfully joined room'
        });

        console.log(`User ${userId} joined room ${roomId}`);
      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('chat:error', {
          message: 'Failed to join room'
        });
      }
    });

    /**
     * Leave a chat room
     * Client emits: { roomId: string }
     */
    socket.on('chat:leave-room', (data: { roomId: string }) => {
      const { roomId } = data;
      socket.leave(`room:${roomId}`);
      
      socket.emit('chat:left-room', {
        roomId,
        message: 'Left room'
      });

      console.log(`User ${userId} left room ${roomId}`);
    });

    /**
     * Send a message in a room
     * Client emits: { roomId: string, content: string }
     */
    socket.on('chat:send-message', async (data: { roomId: string; content: string }) => {
      try {
        const { roomId, content } = data;

        if (!content || content.trim().length === 0) {
          socket.emit('chat:error', {
            message: 'Message content is required'
          });
          return;
        }

        // Verify user is a member of the room
        const membership = await prisma.roomMember.findUnique({
          where: {
            roomId_userId: {
              roomId,
              userId
            }
          }
        });

        if (!membership) {
          socket.emit('chat:error', {
            message: 'You are not a member of this room'
          });
          return;
        }

        // Create message and update room
        const message = await prisma.$transaction(async (tx) => {
          const newMessage = await tx.message.create({
            data: {
              roomId,
              senderId: userId,
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

        // Emit message to all users in the room
        io.to(`room:${roomId}`).emit('chat:new-message', message);

        console.log(`Message sent in room ${roomId} by user ${userId}`);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('chat:error', {
          message: 'Failed to send message'
        });
      }
    });

    /**
     * Typing indicator
     * Client emits: { roomId: string, isTyping: boolean }
     */
    socket.on('chat:typing', async (data: { roomId: string; isTyping: boolean }) => {
      try {
        const { roomId, isTyping } = data;

        // Verify user is a member
        const membership = await prisma.roomMember.findUnique({
          where: {
            roomId_userId: {
              roomId,
              userId
            }
          },
          include: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
          }
        });

        if (!membership) {
          return;
        }

        // Broadcast typing status to other users in the room (exclude sender)
        socket.to(`room:${roomId}`).emit('chat:user-typing', {
          roomId,
          userId,
          userName: membership.user.name,
          isTyping
        });
      } catch (error) {
        console.error('Error handling typing indicator:', error);
      }
    });

    /**
     * Mark messages as read
     * Client emits: { roomId: string, messageIds: string[] }
     */
    socket.on('chat:mark-read', async (data: { roomId: string }) => {
      try {
        const { roomId } = data;

        // Verify membership
        const membership = await prisma.roomMember.findUnique({
          where: {
            roomId_userId: {
              roomId,
              userId
            }
          }
        });

        if (!membership) {
          return;
        }

        // Notify other users that this user has read messages
        socket.to(`room:${roomId}`).emit('chat:messages-read', {
          roomId,
          userId,
          readAt: new Date()
        });
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });

    /**
     * User online/offline status
     * Automatically handled by connection/disconnection
     */
    socket.on('disconnect', () => {
      // Notify rooms that user is offline
      // Get all rooms the user is in from socket.rooms
      socket.rooms.forEach((room) => {
        if (room.startsWith('room:')) {
          socket.to(room).emit('chat:user-offline', {
            userId,
            timestamp: new Date()
          });
        }
      });
    });
  });

  console.log('✓ Chat Socket.IO handlers initialized');
}
