/**
 * Meeting controller - handles meeting management for Scrum Masters
 */
import type { Request, Response } from 'express';
import * as meetingService from '../services/meeting.service';
import { MeetingType } from '@prisma/client';

/**
 * Create a meeting
 * POST /api/spaces/:spaceId/meetings
 * Auth: Required (Scrum Master only)
 */
export async function createMeeting(req: Request, res: Response) {
  try {
    const { spaceId } = req.params;
    const { title, description, type, scheduledAt, duration, sprintId } = req.body;

    if (!spaceId) {
      return res.status(400).json({
        success: false,
        message: 'Space ID is required'
      });
    }

    if (!title || !type || !scheduledAt || !duration) {
      return res.status(400).json({
        success: false,
        message: 'Title, type, scheduledAt, and duration are required'
      });
    }

    // Validate meeting type
    if (!Object.values(MeetingType).includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid meeting type'
      });
    }

    const meeting = await meetingService.createMeeting(
      spaceId,
      req.user!.userId,
      {
        title,
        description,
        type,
        scheduledAt: new Date(scheduledAt),
        duration,
        sprintId
      }
    );

    return res.status(201).json({
      success: true,
      message: 'Meeting created successfully',
      data: meeting
    });

  } catch (error) {
    console.error('Create meeting error:', error);
    
    if (error instanceof Error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Get all meetings for a space
 * GET /api/spaces/:spaceId/meetings
 * Auth: Required (Space member)
 */
export async function getSpaceMeetings(req: Request, res: Response) {
  try {
    const { spaceId } = req.params;

    if (!spaceId) {
      return res.status(400).json({
        success: false,
        message: 'Space ID is required'
      });
    }

    const meetings = await meetingService.getSpaceMeetings(
      spaceId,
      req.user!.userId
    );

    return res.status(200).json({
      success: true,
      data: meetings
    });

  } catch (error) {
    console.error('Get meetings error:', error);
    
    if (error instanceof Error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Get meeting by ID
 * GET /api/meetings/:id
 * Auth: Required (Space member)
 */
export async function getMeetingById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Meeting ID is required'
      });
    }

    const meeting = await meetingService.getMeetingById(
      id,
      req.user!.userId
    );

    return res.status(200).json({
      success: true,
      data: meeting
    });

  } catch (error) {
    console.error('Get meeting error:', error);
    
    if (error instanceof Error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Update meeting
 * PATCH /api/meetings/:id
 * Auth: Required (Scrum Master only)
 */
export async function updateMeeting(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { title, description, type, scheduledAt, duration } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Meeting ID is required'
      });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (type !== undefined) {
      if (!Object.values(MeetingType).includes(type)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid meeting type'
        });
      }
      updateData.type = type;
    }
    if (scheduledAt !== undefined) updateData.scheduledAt = new Date(scheduledAt);
    if (duration !== undefined) updateData.duration = duration;

    const meeting = await meetingService.updateMeeting(
      id,
      req.user!.userId,
      updateData
    );

    return res.status(200).json({
      success: true,
      message: 'Meeting updated successfully',
      data: meeting
    });

  } catch (error) {
    console.error('Update meeting error:', error);
    
    if (error instanceof Error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Delete meeting
 * DELETE /api/meetings/:id
 * Auth: Required (Scrum Master only)
 */
export async function deleteMeeting(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Meeting ID is required'
      });
    }

    await meetingService.deleteMeeting(id, req.user!.userId);

    return res.status(200).json({
      success: true,
      message: 'Meeting deleted successfully'
    });

  } catch (error) {
    console.error('Delete meeting error:', error);
    
    if (error instanceof Error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}
