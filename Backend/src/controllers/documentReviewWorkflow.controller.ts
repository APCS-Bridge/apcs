import { Request, Response } from 'express';
import { ReviewStatus } from '@prisma/client';
import documentReviewWorkflowService from '../services/documentReviewWorkflow.service';

export class DocumentReviewWorkflowController {
    /**
     * POST /api/workflows
     * Create a new document review workflow
     */
    async createWorkflow(req: Request, res: Response) {
        console.log('[DEBUG] createWorkflow - Request received');
        try {
            const userId = req.user?.userId;
            console.log('[DEBUG] createWorkflow - User ID:', userId);

            if (!userId) {
                console.log('[DEBUG] createWorkflow - Unauthorized: Missing userId');
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const {
                title,
                description,
                documentUrl,
                fileName,
                fileSize,
                mimeType,
                spaceId,
                reviewerIds,
            } = req.body;

            console.log('[DEBUG] createWorkflow - Payload:', JSON.stringify(req.body, null, 2));

            // Validation
            if (!title || !documentUrl || !fileName || !fileSize || !mimeType || !reviewerIds) {
                console.log('[DEBUG] createWorkflow - Missing required fields');
                return res.status(400).json({
                    error: 'Missing required fields: title, documentUrl, fileName, fileSize, mimeType, reviewerIds',
                });
            }

            if (!Array.isArray(reviewerIds)) {
                console.log('[DEBUG] createWorkflow - Invalid reviewerIds array');
                return res.status(400).json({
                    error: 'reviewerIds must be an array',
                });
            }

            console.log('[DEBUG] createWorkflow - Calling service.createWorkflow...');
            const workflow = await documentReviewWorkflowService.createWorkflow({
                title,
                description,
                documentUrl,
                fileName,
                fileSize,
                mimeType,
                spaceId,
                createdBy: userId,
                reviewerIds,
            });
            console.log('[DEBUG] createWorkflow - Workflow created successfully:', workflow.id);

            return res.status(201).json({
                success: true,
                message: 'Workflow created successfully',
                data: workflow,
            });
        } catch (error: any) {
            console.error('[DEBUG] createWorkflow - Error:', error);
            return res.status(500).json({
                success: false,
                error: error.message || 'Failed to create workflow',
            });
        }
    }

    /**
     * GET /api/workflows/created
     * Get all workflows created by the current user
     */
    async getCreatedWorkflows(req: Request, res: Response) {
        try {
            const userId = req.user?.userId;
            const userEmail = req.user?.email;
            const spaceId = req.query.spaceId as string | undefined;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            console.log('[DEBUG] getCreatedWorkflows - Request from userId:', userId, 'email:', userEmail, 'spaceId:', spaceId);
            const workflows = await documentReviewWorkflowService.getWorkflowsByCreator(userId, spaceId);
            console.log('[DEBUG] getCreatedWorkflows - Returning', workflows.length, 'workflows');
            
            // Log each workflow's creator for debugging
            workflows.forEach((wf, idx) => {
                console.log(`[DEBUG] Workflow ${idx + 1}: id=${wf.id}, createdBy=${wf.createdBy}, creator.email=${wf.creator?.email}, title=${wf.title}`);
            });
            
            return res.status(200).json({
                success: true,
                data: workflows,
            });
        } catch (error: any) {
            console.error('Error fetching created workflows:', error);
            return res.status(500).json({
                success: false,
                error: error.message || 'Failed to fetch workflows',
            });
        }
    }

    /**
     * GET /api/workflows/assigned
     * Get all workflows assigned to the current user as a reviewer
     */
    async getAssignedWorkflows(req: Request, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const workflows = await documentReviewWorkflowService.getWorkflowsAssignedToReviewer(userId);
            return res.status(200).json({
                success: true,
                data: workflows,
            });
        } catch (error: any) {
            console.error('Error fetching assigned workflows:', error);
            return res.status(500).json({
                success: false,
                error: error.message || 'Failed to fetch workflows',
            });
        }
    }

    /**
     * GET /api/workflows/:workflowId
     * Get a specific workflow by ID
     */
    async getWorkflowById(req: Request, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { workflowId } = req.params;

            const workflow = await documentReviewWorkflowService.getWorkflowById(workflowId as string, userId);
            return res.status(200).json({
                success: true,
                data: workflow,
            });
        } catch (error: any) {
            console.error('Error fetching workflow:', error);
            if (error.message === 'Workflow not found') {
                return res.status(404).json({ success: false, error: error.message });
            }
            if (error.message === 'Unauthorized access to workflow') {
                return res.status(403).json({ success: false, error: error.message });
            }
            return res.status(500).json({
                success: false,
                error: error.message || 'Failed to fetch workflow',
            });
        }
    }

    /**
     * POST /api/workflows/:workflowId/reviewers
     * Add reviewers to an existing workflow
     */
    async addReviewers(req: Request, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { workflowId } = req.params;
            const { reviewerIds } = req.body;

            if (!Array.isArray(reviewerIds) || reviewerIds.length === 0) {
                return res.status(400).json({
                    error: 'reviewerIds must be a non-empty array',
                });
            }

            const result = await documentReviewWorkflowService.addReviewers(
                workflowId as string,
                userId,
                reviewerIds
            );

            return res.status(200).json({
                success: true,
                message: 'Reviewers added successfully',
                data: result,
            });
        } catch (error: any) {
            console.error('Error adding reviewers:', error);
            if (error.message === 'Workflow not found') {
                return res.status(404).json({ success: false, error: error.message });
            }
            if (error.message === 'Only the workflow creator can add reviewers') {
                return res.status(403).json({ success: false, error: error.message });
            }
            return res.status(500).json({
                success: false,
                error: error.message || 'Failed to add reviewers',
            });
        }
    }

    /**
     * PATCH /api/workflows/:workflowId/reviewers/:reviewerId/status
     * Update reviewer status (Approve/Reject/Pending)
     */
    async updateReviewerStatus(req: Request, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { workflowId, reviewerId } = req.params;
            const { status } = req.body;

            // Verify the user is the reviewer
            if (userId !== reviewerId) {
                return res.status(403).json({ error: 'Only the assigned reviewer can update their status' });
            }

            // Validate status
            if (!Object.values(ReviewStatus).includes(status)) {
                return res.status(400).json({
                    error: `Invalid status. Must be one of: ${Object.values(ReviewStatus).join(', ')}`,
                });
            }

            const updatedReviewer = await documentReviewWorkflowService.updateReviewerStatus(
                workflowId as string,
                reviewerId as string,
                status
            );

            return res.status(200).json({
                success: true,
                message: 'Status updated successfully',
                data: updatedReviewer,
            });
        } catch (error: any) {
            console.error('Error updating reviewer status:', error);
            if (error.message === 'Reviewer assignment not found') {
                return res.status(404).json({ success: false, error: error.message });
            }
            return res.status(500).json({
                success: false,
                error: error.message || 'Failed to update status',
            });
        }
    }

    /**
     * POST /api/workflows/:workflowId/reviewers/:reviewerId/comments
     * Add a comment to a review (reviewer or creator can comment)
     */
    async addComment(req: Request, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { workflowId, reviewerId } = req.params;
            const { content, parentId } = req.body;

            if (!content || content.trim() === '') {
                return res.status(400).json({ error: 'Comment content is required' });
            }

            const comment = await documentReviewWorkflowService.addComment({
                workflowId: workflowId as string,
                reviewerId: reviewerId as string,
                userId,
                content,
                parentId,
            });

            return res.status(201).json({
                success: true,
                message: 'Comment added successfully',
                data: comment,
            });
        } catch (error: any) {
            console.error('Error adding comment:', error);
            if (error.message === 'Reviewer assignment not found') {
                return res.status(404).json({ success: false, error: error.message });
            }
            if (error.message === 'Only the reviewer or workflow creator can comment') {
                return res.status(403).json({ success: false, error: error.message });
            }
            if (error.message === 'Invalid parent comment') {
                return res.status(400).json({ success: false, error: error.message });
            }
            return res.status(500).json({
                success: false,
                error: error.message || 'Failed to add comment',
            });
        }
    }

    /**
     * GET /api/workflows/:workflowId/reviewers/:reviewerId/comments
     * Get all comments for a specific reviewer
     */
    async getCommentsByReviewer(req: Request, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { workflowId, reviewerId } = req.params;

            const comments = await documentReviewWorkflowService.getCommentsByReviewer(
                workflowId as string,
                reviewerId as string
            );

            return res.status(200).json({
                success: true,
                data: comments,
            });
        } catch (error: any) {
            console.error('Error fetching comments:', error);
            if (error.message === 'Reviewer assignment not found') {
                return res.status(404).json({ success: false, error: error.message });
            }
            return res.status(500).json({
                success: false,
                error: error.message || 'Failed to fetch comments',
            });
        }
    }
    /**
     * POST /api/workflows/invite-reviewer
     * Invite external reviewer
     */
    async inviteReviewer(req: Request, res: Response) {
        try {
            const { email, name } = req.body;
            if (!email || !name) {
                return res.status(400).json({ error: 'Email and name are required' });
            }

            const user = await documentReviewWorkflowService.inviteReviewer(email, name);
            return res.status(200).json({
                success: true,
                message: 'Reviewer invited successfully',
                data: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    avatarUrl: user.avatarUrl,
                },
            });
        } catch (error: any) {
            console.error('Error inviting reviewer:', error);
            return res.status(500).json({
                success: false,
                error: error.message || 'Failed to invite reviewer',
            });
        }
    }

    /**
     * DELETE /api/workflows/:workflowId
     * Delete a workflow (only by creator)
     */
    async deleteWorkflow(req: Request, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { workflowId } = req.params;

            await documentReviewWorkflowService.deleteWorkflow(workflowId as string, userId);
            return res.status(200).json({
                success: true,
                message: 'Workflow deleted successfully',
            });
        } catch (error: any) {
            console.error('Error deleting workflow:', error);
            if (error.message === 'Workflow not found') {
                return res.status(404).json({ success: false, error: error.message });
            }
            if (error.message === 'Only the workflow creator can delete it') {
                return res.status(403).json({ success: false, error: error.message });
            }
            return res.status(500).json({
                success: false,
                error: error.message || 'Failed to delete workflow',
            });
        }
    }
}

export default new DocumentReviewWorkflowController();

