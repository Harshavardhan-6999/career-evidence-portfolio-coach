/**
 * Module 4: User Profile Service
 * Owner: M. Rohit Sai (25071A66B2)
 *
 * Implements user profile persistence and management using MongoDB Mongoose models
 * with support for both MongoDB ObjectIds and legacy UUIDs.
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { AppError } from '../validators/commonValidators.js';
import { getRoleById } from './roleService.js';
import { isDbConnected } from '../storage/db.js';

/**
 * Helper to build query filter supporting either native MongoDB ObjectId or legacy UUID.
 * @param {string} userId
 */
export function buildUserFilter(userId) {
  if (mongoose.Types.ObjectId.isValid(userId)) {
    return { $or: [{ _id: userId }, { legacyId: userId }] };
  }
  return { legacyId: userId };
}

/**
 * Creates a new student career profile.
 * @param {object} profileData
 */
export async function createUser(profileData) {
  if (!isDbConnected()) {
    throw new AppError('Database connection unavailable. Please check MONGODB_URI.', 503, 'DATABASE_UNAVAILABLE');
  }

  const role = await getRoleById(profileData.targetRoleId);
  if (!role) {
    throw new AppError(`Target role "${profileData.targetRoleId}" does not exist`, 400, 'VALIDATION_ERROR');
  }

  // Generate random password hash if creating profile without explicit credentials
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(`Student@${Date.now()}`, salt);
  const email = profileData.email || `student_${Date.now()}@college.edu`;

  const user = await User.create({
    name: profileData.name,
    email,
    passwordHash,
    education: profileData.education,
    interests: profileData.interests || [],
    targetRoleId: profileData.targetRoleId,
    bio: profileData.bio || ''
  });

  return user.toJSON();
}

/**
 * Retrieves a user profile by ID.
 * @param {string} userId
 */
export async function getUserById(userId) {
  if (!isDbConnected()) {
    throw new AppError('Database connection unavailable. Please check MONGODB_URI.', 503, 'DATABASE_UNAVAILABLE');
  }

  const user = await User.findOne(buildUserFilter(userId));
  if (!user) {
    throw new AppError(`User profile with ID "${userId}" not found`, 404, 'NOT_FOUND');
  }

  const role = await getRoleById(user.targetRoleId);
  return {
    ...user.toJSON(),
    targetRole: role ? { id: role.id, name: role.name, description: role.description } : null
  };
}

/**
 * Updates an existing user profile (PATCH).
 * @param {string} userId
 * @param {object} updates
 */
export async function updateUser(userId, updates) {
  if (!isDbConnected()) {
    throw new AppError('Database connection unavailable. Please check MONGODB_URI.', 503, 'DATABASE_UNAVAILABLE');
  }

  if (updates.targetRoleId) {
    const role = await getRoleById(updates.targetRoleId);
    if (!role) {
      throw new AppError(`Target role "${updates.targetRoleId}" does not exist`, 400, 'VALIDATION_ERROR');
    }
  }

  const user = await User.findOne(buildUserFilter(userId));
  if (!user) {
    throw new AppError(`User profile with ID "${userId}" not found`, 404, 'NOT_FOUND');
  }

  if (updates.name !== undefined) user.name = updates.name;
  if (updates.education !== undefined) user.education = updates.education;
  if (updates.interests !== undefined) user.interests = updates.interests;
  if (updates.targetRoleId !== undefined) user.targetRoleId = updates.targetRoleId;
  if (updates.bio !== undefined) user.bio = updates.bio;

  await user.save();
  return user.toJSON();
}
