/**
 * User service - Business logic for user management
 */
import prisma from '../lib/prisma';
import { hashPassword } from '../lib/auth';
import type { UserRole } from '@prisma/client';

export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string | null;
  createdAt: Date;
}

/**
 * Create a new user (ADMIN or USER)
 * Only SUPERADMIN can create ADMIN users
 */
export async function createUser(
  input: CreateUserInput,
  creatorRole: UserRole
): Promise<UserResponse> {
  // Validate: Only SUPERADMIN can create ADMIN users
  if (input.role === 'ADMIN' && creatorRole !== 'SUPERADMIN') {
    throw new Error('Only SUPERADMIN can create ADMIN users');
  }

  // Validate: Cannot create SUPERADMIN users
  if (input.role === 'SUPERADMIN') {
    throw new Error('Cannot create SUPERADMIN users through this endpoint');
  }

  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email }
  });

  if (existingUser) {
    throw new Error('Email already exists');
  }

  // Hash password
  const passwordHash = await hashPassword(input.password);

  // Create user
  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      name: input.name,
      role: input.role
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatarUrl: true,
      createdAt: true
    }
  });

  return user;
}

/**
 * Get all users (with pagination)
 */
export async function getAllUsers(
  page: number = 1,
  limit: number = 10
): Promise<{ users: UserResponse[]; total: number; page: number; totalPages: number }> {
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    }),
    prisma.user.count()
  ]);

  return {
    users,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<UserResponse | null> {
  console.log('🔍 [SERVICE] Fetching user by ID', { userId });
  
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        createdAt: true
      }
    });

    console.log('✅ [SERVICE] User fetch successful', { found: !!user, userId });
    return user;
  } catch (error) {
    console.error('❌ [SERVICE] Error fetching user', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Update user role (only SUPERADMIN can do this)
 */
export async function updateUserRole(
  userId: string,
  newRole: UserRole,
  updaterRole: UserRole
): Promise<UserResponse> {
  // Only SUPERADMIN can update roles
  if (updaterRole !== 'SUPERADMIN') {
    throw new Error('Only SUPERADMIN can update user roles');
  }

  // Cannot change to/from SUPERADMIN
  if (newRole === 'SUPERADMIN') {
    throw new Error('Cannot promote users to SUPERADMIN');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (user.role === 'SUPERADMIN') {
    throw new Error('Cannot modify SUPERADMIN users');
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { role: newRole },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatarUrl: true,
      createdAt: true
    }
  });

  return updatedUser;
}

/**
 * Update user details (ADMIN can update USER details, SUPERADMIN can update all)
 */
export async function updateUser(
  userId: string,
  data: { name?: string; email?: string },
  updaterRole: UserRole,
  updaterId: string
): Promise<UserResponse> {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Prevent modification of SUPERADMIN by non-SUPERADMIN
  if (user.role === 'SUPERADMIN' && updaterRole !== 'SUPERADMIN') {
    throw new Error('Cannot modify SUPERADMIN users');
  }

  // ADMIN can only update USER accounts, not ADMIN accounts
  if (updaterRole === 'ADMIN' && user.role === 'ADMIN') {
    throw new Error('ADMIN cannot modify other ADMIN users');
  }

  // Check if email is being changed and if it already exists
  if (data.email && data.email !== user.email) {
    const existingEmail = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existingEmail) {
      throw new Error('Email already in use');
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatarUrl: true,
      createdAt: true
    }
  });

  return updatedUser;
}

/**
 * Delete user (only SUPERADMIN can do this)
 */
export async function deleteUser(
  userId: string,
  deleterRole: UserRole
): Promise<void> {
  // Only SUPERADMIN can delete users
  if (deleterRole !== 'SUPERADMIN') {
    throw new Error('Only SUPERADMIN can delete users');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (user.role === 'SUPERADMIN') {
    throw new Error('Cannot delete SUPERADMIN users');
  }

  await prisma.user.delete({
    where: { id: userId }
  });
}

/**
 * Delete user by ADMIN (can only delete USER accounts)
 */
export async function deleteUserByAdmin(
  userId: string,
  deleterRole: UserRole
): Promise<void> {
  if (deleterRole !== 'ADMIN' && deleterRole !== 'SUPERADMIN') {
    throw new Error('Only ADMIN or SUPERADMIN can delete users');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Prevent deletion of SUPERADMIN
  if (user.role === 'SUPERADMIN') {
    throw new Error('Cannot delete SUPERADMIN users');
  }

  // ADMIN can only delete USER accounts, not ADMIN accounts
  if (deleterRole === 'ADMIN' && user.role === 'ADMIN') {
    throw new Error('ADMIN cannot delete other ADMIN users');
  }

  await prisma.user.delete({
    where: { id: userId }
  });
}

/**
 * Update user profile (allows users to update their own profile or admins to update others)
 * Supports updating name, email, and password
 */
export async function updateUserProfile(
  userId: string,
  data: { name?: string; email?: string; password?: string },
  updaterRole: UserRole,
  updaterId: string,
  isOwnProfile: boolean
): Promise<UserResponse> {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new Error('User not found');
  }

  // If not updating own profile, check admin permissions
  if (!isOwnProfile) {
    // Prevent modification of SUPERADMIN by non-SUPERADMIN
    if (user.role === 'SUPERADMIN' && updaterRole !== 'SUPERADMIN') {
      throw new Error('Cannot modify SUPERADMIN users');
    }

    // ADMIN can only update USER accounts, not ADMIN accounts
    if (updaterRole === 'ADMIN' && user.role === 'ADMIN') {
      throw new Error('ADMIN cannot modify other ADMIN users');
    }

    // Regular users cannot update other users' profiles
    if (updaterRole === 'USER') {
      throw new Error('You can only update your own profile');
    }
  }

  // Check if email is being changed and if it already exists
  if (data.email && data.email !== user.email) {
    const existingEmail = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existingEmail) {
      throw new Error('Email already in use');
    }
  }

  // Prepare update data
  const updateData: {
    name?: string;
    email?: string;
    passwordHash?: string;
  } = {};

  if (data.name) updateData.name = data.name;
  if (data.email) updateData.email = data.email;
  if (data.password) {
    updateData.passwordHash = await hashPassword(data.password);
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatarUrl: true,
      createdAt: true
    }
  });

  return updatedUser;
}
