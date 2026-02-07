/**
 * User routes
 */
import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import * as uploadController from '../controllers/upload.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { uploadAvatar } from '../middleware/upload.middleware';

const router = Router();

// All user routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/users/me
 * @desc    Get current user profile
 * @access  Private (Any authenticated user)
 */
router.get('/me', userController.getCurrentUser);

/**
 * @route   POST /api/users
 * @desc    Create a new user (SUPERADMIN can create ADMIN, both can create USER)
 * @access  Private (SUPERADMIN or ADMIN)
 */
router.post('/', authorize('SUPERADMIN', 'ADMIN'), userController.createUser);

/**
 * @route   GET /api/users
 * @desc    Get all users (with pagination)
 * @access  Private (Any authenticated user - for workspace member selection)
 */
router.get('/', userController.getAllUsers);

/**
 * @route   PUT /api/users/:id/avatar
 * @desc    Upload user avatar
 * @access  Private (Any authenticated user for own avatar, SUPERADMIN/ADMIN for others)
 */
router.put('/:id/avatar', uploadAvatar, uploadController.uploadUserAvatar);

/**
 * @route   DELETE /api/users/:id/avatar
 * @desc    Delete user avatar
 * @access  Private (Any authenticated user for own avatar, SUPERADMIN/ADMIN for others)
 */
router.delete('/:id/avatar', uploadController.deleteUserAvatar);

/**
 * @route   PATCH /api/users/:id/role
 * @desc    Update user role
 * @access  Private (SUPERADMIN only)
 */
router.patch('/:id/role', authorize('SUPERADMIN'), userController.updateUserRole);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID (users can access their own profile, admins can access any)
 * @access  Private (Any authenticated user for own profile, SUPERADMIN/ADMIN for others)
 */
router.get('/:id', userController.getUserById);

/**
 * @route   PUT /api/users/:id
 * @desc    Update user profile (users can update their own profile, admins can update any)
 * @access  Private (Any authenticated user for own profile, SUPERADMIN/ADMIN for others)
 */
router.put('/:id', userController.updateUserProfile);

/**
 * @route   PATCH /api/users/:id
 * @desc    Update user details (name, email) - Admin only endpoint
 * @access  Private (SUPERADMIN or ADMIN)
 */
router.patch('/:id', authorize('SUPERADMIN', 'ADMIN'), userController.updateUser);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user (SUPERADMIN: all users, ADMIN: USER only)
 * @access  Private (SUPERADMIN or ADMIN)
 */
router.delete('/:id', authorize('SUPERADMIN', 'ADMIN'), userController.deleteUser);

export default router;
