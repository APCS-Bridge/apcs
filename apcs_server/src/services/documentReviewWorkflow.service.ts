import { ReviewStatus } from '@prisma/client';
import prisma from '../lib/prisma';

export class DocumentReviewWorkflowService {
    /**
     * Create a new document review workflow
     */
    async createWorkflow(data: {
        title: string;
        description?: string;
        documentUrl: string;
        fileName: string;
        fileSize: number;
        mimeType: string;
        spaceId?: string;
        createdBy: string;
        reviewerIds: string[];
    }) {
        console.log('[DEBUG] Service createWorkflow - Start');
        console.log('[DEBUG] Service createWorkflow - Data:', JSON.stringify(data, null, 2));

        const { reviewerIds, ...workflowData } = data;

        // Prevent creator from adding themselves
        if (reviewerIds.includes(workflowData.createdBy)) {
            throw new Error("You cannot add yourself as a reviewer.");
        }

        try {
            // Create workflow with assigned reviewers
            console.log('[DEBUG] Service createWorkflow - Executing Prisma create...');
            const workflow = await prisma.documentReviewWorkflow.create({
                data: {
                    ...workflowData,
                    reviewers: {
                        create: reviewerIds.map((reviewerId) => ({
                            reviewerId,
                            status: ReviewStatus.PENDING,
                        })),
                    },
                },
                include: {
                    creator: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: true, // Assuming role exists on user
                            avatarUrl: true,
                        },
                    },
                    reviewers: {
                        include: {
                            reviewer: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true,
                                    avatarUrl: true,
                                },
                            },
                        },
                    },
                },
            });
            console.log('[DEBUG] Service createWorkflow - Prisma create success. Workflow ID:', workflow.id);
            return workflow;
        } catch (error) {
            console.error('[DEBUG] Service createWorkflow - Prisma create failed:', error);
            throw error;
        }
    }

    /**
     * Get all workflows created by a user, optionally filtered by spaceId
     */
    async getWorkflowsByCreator(userId: string, spaceId?: string) {
        console.log('[DEBUG] getWorkflowsByCreator - userId:', userId, 'spaceId:', spaceId);
        const whereClause: any = { createdBy: userId };
        if (spaceId) {
            whereClause.spaceId = spaceId;
        }
        const workflows = await prisma.documentReviewWorkflow.findMany({
            where: whereClause,
            include: {
                creator: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatarUrl: true,
                    },
                },
                reviewers: {
                    include: {
                        reviewer: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                avatarUrl: true,
                            },
                        },
                        comments: {
                            include: {
                                author: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true,
                                        avatarUrl: true,
                                    },
                                },
                            },
                            orderBy: { createdAt: 'desc' },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        console.log('[DEBUG] getWorkflowsByCreator - Found', workflows.length, 'workflows for user', userId);
        return workflows;
    }

    /**
     * Get all workflows assigned to a user as reviewer
     */
    async getWorkflowsAssignedToReviewer(userId: string) {
        const reviewerAssignments = await prisma.documentReviewer.findMany({
            where: { reviewerId: userId },
            include: {
                workflow: {
                    include: {
                        creator: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                avatarUrl: true,
                            },
                        },
                        reviewers: {
                            include: {
                                reviewer: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true,
                                        avatarUrl: true,
                                    },
                                },
                            },
                        },
                    },
                },
                comments: {
                    include: {
                        author: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                avatarUrl: true,
                            },
                        },
                        replies: {
                            include: {
                                author: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true,
                                        avatarUrl: true,
                                    },
                                },
                            },
                        },
                    },
                    where: { parentId: null }, // Only top-level comments
                    orderBy: { createdAt: 'desc' },
                },
            },
            orderBy: { assignedAt: 'desc' },
        });

        return reviewerAssignments.map(a => a.workflow);
    }

    /**
     * Get a specific workflow by ID
     */
    async getWorkflowById(workflowId: string, userId: string) {
        const workflow = await prisma.documentReviewWorkflow.findUnique({
            where: { id: workflowId },
            include: {
                creator: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatarUrl: true,
                    },
                },
                reviewers: {
                    include: {
                        reviewer: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                avatarUrl: true,
                            },
                        },
                        comments: {
                            include: {
                                author: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true,
                                        avatarUrl: true,
                                    },
                                },
                                replies: {
                                    include: {
                                        author: {
                                            select: {
                                                id: true,
                                                name: true,
                                                email: true,
                                                avatarUrl: true,
                                            },
                                        },
                                    },
                                    orderBy: { createdAt: 'asc' },
                                },
                            },
                            where: { parentId: null }, // Only top-level comments
                            orderBy: { createdAt: 'desc' },
                        },
                    },
                },
            },
        });

        if (!workflow) {
            throw new Error('Workflow not found');
        }

        // Check if user has access (creator or reviewer)
        const hasAccess =
            workflow.createdBy === userId ||
            workflow.reviewers.some((r: any) => r.reviewerId === userId);

        if (!hasAccess) {
            throw new Error('Unauthorized access to workflow');
        }

        return workflow;
    }

    /**
     * Add reviewers to an existing workflow
     */
    async addReviewers(workflowId: string, creatorId: string, reviewerIds: string[]) {
        // Prevent creator from adding themselves
        if (reviewerIds.includes(creatorId)) {
            throw new Error("You cannot add yourself as a reviewer.");
        }

        // Verify the user is the creator
        const workflow = await prisma.documentReviewWorkflow.findUnique({
            where: { id: workflowId },
        });

        if (!workflow) {
            throw new Error('Workflow not found');
        }

        if (workflow.createdBy !== creatorId) {
            throw new Error('Only the workflow creator can add reviewers');
        }

        // Get existing reviewers
        const existingReviewers = await prisma.documentReviewer.findMany({
            where: { workflowId },
            select: { reviewerId: true },
        });

        const existingReviewerIds = existingReviewers.map((r: any) => r.reviewerId);

        // Filter out already assigned reviewers
        const newReviewerIds = reviewerIds.filter(
            (id) => !existingReviewerIds.includes(id)
        );

        if (newReviewerIds.length === 0) {
            return this.getWorkflowById(workflowId, creatorId);
        }

        // Validate that all reviewer IDs exist in the users table
        const users = await prisma.user.findMany({
            where: {
                id: {
                    in: newReviewerIds
                }
            },
            select: {
                id: true
            }
        });

        const validUserIds = users.map(u => u.id);
        const invalidUserIds = newReviewerIds.filter(id => !validUserIds.includes(id));

        if (invalidUserIds.length > 0) {
            throw new Error(`The following user IDs do not exist: ${invalidUserIds.join(', ')}`);
        }

        // Add new reviewers
        if (newReviewerIds.length > 0) {
            await prisma.documentReviewer.createMany({
                data: newReviewerIds.map((reviewerId) => ({
                    workflowId,
                    reviewerId,
                    status: ReviewStatus.PENDING,
                })),
            });
        }

        // Return the updated workflow
        return this.getWorkflowById(workflowId, creatorId);

    }

    /**
     * Update reviewer status (Approve/Reject/Pending)
     */
    async updateReviewerStatus(
        workflowId: string,
        reviewerId: string,
        status: ReviewStatus
    ) {
        const reviewer = await prisma.documentReviewer.findUnique({
            where: {
                workflowId_reviewerId: {
                    workflowId,
                    reviewerId,
                },
            },
        });

        if (!reviewer) {
            throw new Error('Reviewer assignment not found');
        }

        const updatedReviewer = await prisma.documentReviewer.update({
            where: {
                workflowId_reviewerId: {
                    workflowId,
                    reviewerId,
                },
            },
            data: { status },
            include: {
                reviewer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatarUrl: true,
                    },
                },
            },
        });

        return updatedReviewer;
    }

    /**
     * Invite an external reviewer (find or create user)
     */
    async inviteReviewer(email: string, name: string) {
        // Find existing user by both name and email for verification
        const user = await prisma.user.findFirst({
            where: {
                email,
                name: {
                    equals: name,
                    mode: "insensitive" // Be a bit flexible with casing
                }
            },
        });

        if (!user) {
            throw new Error(`User with email "${email}" and name "${name}" was not found in the system. Please ensure they are registered.`);
        }

        return user;
    }

    /**
     * Add a comment to a review
     */
    async addComment(data: {
        workflowId: string;
        reviewerId: string;
        userId: string;
        content: string;
        parentId?: string;
    }) {
        const { workflowId, reviewerId, userId, content, parentId } = data;

        // Verify the reviewer assignment exists
        const reviewerAssignment = await prisma.documentReviewer.findUnique({
            where: {
                workflowId_reviewerId: {
                    workflowId,
                    reviewerId,
                },
            },
            include: {
                workflow: true,
            },
        });

        if (!reviewerAssignment) {
            throw new Error('Reviewer assignment not found');
        }

        // Verify the user is either the reviewer or the workflow creator
        const isReviewer = reviewerId === userId;
        const isCreator = reviewerAssignment.workflow.createdBy === userId;

        if (!isReviewer && !isCreator) {
            throw new Error('Only the reviewer or workflow creator can comment');
        }

        // If parentId is provided, verify it belongs to this reviewer's thread
        if (parentId) {
            const parentComment = await prisma.reviewComment.findUnique({
                where: { id: parentId },
            });

            if (!parentComment || parentComment.reviewerId !== reviewerAssignment.id) {
                throw new Error('Invalid parent comment');
            }
        }

        const comment = await prisma.reviewComment.create({
            data: {
                reviewerId: reviewerAssignment.id,
                userId,
                content,
                parentId: parentId ?? null,
            },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatarUrl: true,
                    },
                },
            },
        });

        return comment;
    }

    /**
     * Get all comments for a specific reviewer in a workflow
     */
    async getCommentsByReviewer(workflowId: string, reviewerId: string) {
        const reviewerAssignment = await prisma.documentReviewer.findUnique({
            where: {
                workflowId_reviewerId: {
                    workflowId,
                    reviewerId,
                },
            },
        });

        if (!reviewerAssignment) {
            throw new Error('Reviewer assignment not found');
        }

        const comments = await prisma.reviewComment.findMany({
            where: {
                reviewerId: reviewerAssignment.id,
                parentId: null, // Only top-level comments
            },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatarUrl: true,
                    },
                },
                replies: {
                    include: {
                        author: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                avatarUrl: true,
                            },
                        },
                    },
                    orderBy: { createdAt: 'asc' },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return comments;
    }

    /**
     * Delete a workflow (only by creator)
     */
    async deleteWorkflow(workflowId: string, userId: string) {
        // Verify the workflow exists and user is the creator
        const workflow = await prisma.documentReviewWorkflow.findUnique({
            where: { id: workflowId },
        });

        if (!workflow) {
            throw new Error('Workflow not found');
        }

        if (workflow.createdBy !== userId) {
            throw new Error('Only the workflow creator can delete it');
        }

        // Delete the workflow (cascade will delete reviewers and comments)
        await prisma.documentReviewWorkflow.delete({
            where: { id: workflowId },
        });

        return { success: true, message: 'Workflow deleted successfully' };
    }
}

export default new DocumentReviewWorkflowService();
