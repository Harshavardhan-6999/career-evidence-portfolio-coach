/**
 * Authentication Service
 * Manages user registration, credential verification, and profile retrieval.
 */

import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { AppError } from '../validators/commonValidators.js';
import { getRoleById } from './roleService.js';

/**
 * Register a new student account.
 * @param {object} payload
 */
export async function register(payload) {
  const existing = await User.findOne({ email: payload.email });
  if (existing) {
    throw new AppError('An account with this email already exists', 409, 'EMAIL_ALREADY_EXISTS');
  }

  const role = await getRoleById(payload.targetRoleId);
  if (!role) {
    throw new AppError(`Target role "${payload.targetRoleId}" does not exist in role catalog`, 400, 'VALIDATION_ERROR');
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(payload.password, salt);

  const user = await User.create({
    name: payload.name,
    email: payload.email,
    passwordHash,
    education: payload.education,
    interests: payload.interests,
    targetRoleId: payload.targetRoleId,
    bio: payload.bio
  });

  return user;
}

/**
 * Authenticate student with email and password.
 * @param {string} email
 * @param {string} password
 */
export async function login(email, password) {
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  return user;
}

/**
 * Get current authenticated user profile with target role populated.
 * @param {string} userId
 */
export async function getCurrentUser(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User profile not found', 404, 'NOT_FOUND');
  }

  const role = await getRoleById(user.targetRoleId);
  return {
    ...user.toJSON(),
    targetRole: role ? { id: role.id, name: role.name, description: role.description } : null
  };
}
