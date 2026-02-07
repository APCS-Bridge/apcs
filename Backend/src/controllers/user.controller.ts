/**
 * User controller - HTTP handlers for user management
 */
import type { Request, Response } from 'express';
import * as userService from '../services/user.service';
import type { UserRole } from '@prisma/client';

/**
 * Create a new user (Admin or User)
 * POST /api/users
 * Body: { email: string, password: string, name: string, role: 'ADMIN' | 'USER' }
 * Auth: Required (SUPERADMIN for ADMIN role, SUPERADMIN/ADMIN for USER role)
 */
export async function createUser(req: Request, res: Response) {
  try {
    const { email, password, name, role } = req.body;

    // Validate input
    if (!email || !password || !name || !role) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, name, and role are required'
      });
    }

    // Validate role
    if (!['USER', 'ADMIN'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be either USER or ADMIN'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    // Check authorization (ADMIN can only create USER, SUPERADMIN can create both)
    if (role === 'ADMIN' && req.user?.role !== 'SUPERADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Only SUPERADMIN can create ADMIN users'
      });
    }

    // Create user
    const user = await userService.createUser(
      { email, password, name, role: role as UserRole },
      req.user!.role
    );

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user
    });

  } catch (error) {
    console.error('Create user error:', error);
    
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
 * Get all users
 * GET /api/users
 * Query: page, limit
 * Auth: Required (SUPERADMIN or ADMIN)
 */
export async function getAllUsers(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await userService.getAllUsers(page, limit);

    return res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Get users error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Get user by ID
 * GET /api/users/:id
 * Auth: Required (Any authenticated user for own profile, SUPERADMIN/ADMIN for others)
 */
export async function getUserById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Check if user is accessing their own profile or is an admin
    const isOwnProfile = req.user!.userId === id;
    const isAdmin = ['SUPERADMIN', 'ADMIN'].includes(req.user!.role);

    if (!isOwnProfile && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You can only access your own profile'
      });
    }

    const user = await userService.getUserById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Update user details
 * PATCH /api/users/:id
 * Body: { name?: string, email?: string }
 * Auth: Required (SUPERADMIN or ADMIN)
 */
export async function updateUser(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, email } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    if (!name && !email) {
      return res.status(400).json({
        success: false,
        message: 'At least one field (name or email) is required'
      });
    }

    // Validate email format if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format'
        });
      }
    }

    const updateData: { name?: string; email?: string } = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;

    const user = await userService.updateUser(
      id,
      updateData,
      req.user!.role,
      req.user!.userId
    );

    return res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: user
    });

  } catch (error) {
    console.error('Update user error:', error);
    
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
 * Update user role
 * PATCH /api/users/:id/role
 * Body: { role: 'ADMIN' | 'USER' }
 * Auth: Required (SUPERADMIN only)
 */
export async function updateUserRole(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    if (!role || !['USER', 'ADMIN'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Valid role is required (USER or ADMIN)'
      });
    }

    const user = await userService.updateUserRole(
      id,
      role as UserRole,
      req.user!.role
    );

    return res.status(200).json({
      success: true,
      message: 'User role updated successfully',
      data: user
    });

  } catch (error) {
    console.error('Update user role error:', error);
    
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
 * Delete user
 * DELETE /api/users/:id
 * Auth: Required (SUPERADMIN can delete all, ADMIN can delete USER only)
 */
export async function deleteUser(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Use appropriate delete function based on role
    if (req.user!.role === 'SUPERADMIN') {
      await userService.deleteUser(id, req.user!.role);
    } else if (req.user!.role === 'ADMIN') {
      await userService.deleteUserByAdmin(id, req.user!.role);
    } else {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    
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
 * Get current user profile
 * GET /api/users/me
 * Auth: Required
 */
export async function getCurrentUser(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    console.log('👤 [BACKEND] Get current user request', { userId });

    if (!userId) {
      console.warn('⚠️ [BACKEND] No userId in request');
      return res.status(401).json({
        success: false,
        message: 'No user ID provided'
      });
    }

    const user = await userService.getUserById(userId);
    console.log('✅ [BACKEND] User fetched from database', { userId, found: !!user });

    if (!user) {
      console.warn('⚠️ [BACKEND] User not found in database', { userId });
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('❌ [BACKEND] Get current user error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Update user profile (PUT endpoint)
 * PUT /api/users/:id
 * Body: { name?: string, email?: string, password?: string }
 * Auth: Required (Any user for own profile, SUPERADMIN/ADMIN for others)
 */
export async function updateUserProfile(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, email, password } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Check if user is updating their own profile or is an admin
    const isOwnProfile = req.user!.userId === id;
    const isAdmin = ['SUPERADMIN', 'ADMIN'].includes(req.user!.role);

    if (!isOwnProfile && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own profile'
      });
    }

    // Validate that at least one field is provided
    if (!name && !email && !password) {
      return res.status(400).json({
        success: false,
        message: 'At least one field (name, email, or password) is required'
      });
    }

    // Validate email format if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format'
        });
      }
    }

    // Validate password strength if provided
    if (password && password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    const updateData: { name?: string; email?: string; password?: string } = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (password) updateData.password = password;

    const user = await userService.updateUserProfile(
      id,
      updateData,
      req.user!.role,
      req.user!.userId,
      isOwnProfile
    );

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });

  } catch (error) {
    console.error('Update user profile error:', error);
    
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
