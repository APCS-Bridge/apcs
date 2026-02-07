import { Router } from 'express';
import documentReviewWorkflowController from '../controllers/documentReviewWorkflow.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/workflows
 * @desc    Create a new document review workflow
 * @access  Private
 */
router.post('/', (req, res) => documentReviewWorkflowController.createWorkflow(req, res));

/**
 * @route   GET /api/workflows/created
 * @desc    Get all workflows created by the current user
 * @access  Private
 */
router.get('/created', (req, res) => documentReviewWorkflowController.getCreatedWorkflows(req, res));

/**
 * @route   GET /api/workflows/assigned
 * @desc    Get all workflows assigned to the current user as a reviewer
 * @access  Private
 */
router.get('/assigned', (req, res) => documentReviewWorkflowController.getAssignedWorkflows(req, res));

/**
 * @route   GET /api/workflows/:workflowId
 * @desc    Get a specific workflow by ID
 * @access  Private (creator or assigned reviewer)
 */
router.get('/:workflowId', (req, res) => documentReviewWorkflowController.getWorkflowById(req, res));

/**
 * @route   POST /api/workflows/:workflowId/reviewers
 * @desc    Add reviewers to an existing workflow
 * @access  Private (creator only)
 */
router.post('/:workflowId/reviewers', (req, res) => documentReviewWorkflowController.addReviewers(req, res));

/**
 * @route   PATCH /api/workflows/:workflowId/reviewers/:reviewerId/status
 * @desc    Update reviewer status (Approve/Reject/Pending)
 * @access  Private (assigned reviewer only)
 */
router.patch('/:workflowId/reviewers/:reviewerId/status', (req, res) =>
    documentReviewWorkflowController.updateReviewerStatus(req, res)
);

/**
 * @route   POST /api/workflows/:workflowId/reviewers/:reviewerId/comments
 * @desc    Add a comment to a review
 * @access  Private (reviewer or creator)
 */
router.post('/:workflowId/reviewers/:reviewerId/comments', (req, res) =>
    documentReviewWorkflowController.addComment(req, res)
);

/**
 * @route   GET /api/workflows/:workflowId/reviewers/:reviewerId/comments
 * @desc    Get all comments for a specific reviewer
 * @access  Private
 */
router.get('/:workflowId/reviewers/:reviewerId/comments', (req, res) =>
    documentReviewWorkflowController.getCommentsByReviewer(req, res)
);

/**
 * @route   POST /api/workflows/invite-reviewer
 * @desc    Invite an external reviewer (find or create user)
 * @access  Private
 */
router.post('/invite-reviewer', (req, res) =>
    documentReviewWorkflowController.inviteReviewer(req, res)
);

/**
 * @route   DELETE /api/workflows/:workflowId
 * @desc    Delete a workflow (only by creator)
 * @access  Private (creator only)
 */
router.delete('/:workflowId', (req, res) =>
    documentReviewWorkflowController.deleteWorkflow(req, res)
);

export default router;
