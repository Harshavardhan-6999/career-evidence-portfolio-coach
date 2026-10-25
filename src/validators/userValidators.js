/**
 * Module 9: User Profile Validators
 * Owner: P. Sasikanth (25071A66C3)
 */

import { AppError, isNonEmptyString, isValidUUID } from './commonValidators.js';

/**
 * Validates payload for creating a new user profile.
 * @param {object} body
 * @param {Array<{id: string}>} roleCatalog
 */
export function validateCreateUser(body, roleCatalog = []) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError('Request body must be a JSON object', 400, 'VALIDATION_ERROR');
  }

  const { name, education, interests, targetRoleId, bio } = body;
  const errors = [];

  if (!isNonEmptyString(name, 2, 100)) {
    errors.push('name is required and must be between 2 and 100 characters');
  }

  if (!isNonEmptyString(education, 2, 150)) {
    errors.push('education is required and must be between 2 and 150 characters');
  }

  if (!isNonEmptyString(targetRoleId, 2, 80)) {
    errors.push('targetRoleId is required and must be a non-empty string');
  } else if (roleCatalog.length > 0 && !roleCatalog.some((r) => r.id === targetRoleId)) {
    errors.push(`targetRoleId "${targetRoleId}" is not recognized in the role catalog`);
  }

  if (interests !== undefined) {
    if (!Array.isArray(interests) && typeof interests !== 'string') {
      errors.push('interests must be an array of strings or a comma-delimited string');
    }
  }

  if (bio !== undefined && bio !== null) {
    if (typeof bio !== 'string' || bio.length > 1000) {
      errors.push('bio must be a string up to 1000 characters');
    }
  }

  if (errors.length > 0) {
    throw new AppError('User profile validation failed', 400, 'VALIDATION_ERROR', errors);
  }

  return {
    name: name.trim(),
    education: education.trim(),
    interests: Array.isArray(interests)
      ? interests.map((i) => String(i).trim()).filter(Boolean)
      : typeof interests === 'string'
      ? interests.split(',').map((i) => i.trim()).filter(Boolean)
      : [],
    targetRoleId: targetRoleId.trim(),
    bio: bio ? bio.trim() : ''
  };
}

/**
 * Validates payload for updating an existing user profile (PATCH).
 * @param {object} body
 * @param {Array<{id: string}>} roleCatalog
 */
export function validateUpdateUser(body, roleCatalog = []) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError('Request body must be a JSON object', 400, 'VALIDATION_ERROR');
  }

  const allowedFields = ['name', 'education', 'interests', 'targetRoleId', 'bio'];
  const keys = Object.keys(body);
  const unknownKeys = keys.filter((k) => !allowedFields.includes(k));

  if (unknownKeys.length > 0) {
    throw new AppError(`Unknown update fields: ${unknownKeys.join(', ')}`, 400, 'VALIDATION_ERROR');
  }

  if (keys.length === 0) {
    throw new AppError('At least one field must be provided for update', 400, 'VALIDATION_ERROR');
  }

  const errors = [];
  const updates = {};

  if (body.name !== undefined) {
    if (!isNonEmptyString(body.name, 2, 100)) {
      errors.push('name must be between 2 and 100 characters');
    } else {
      updates.name = body.name.trim();
    }
  }

  if (body.education !== undefined) {
    if (!isNonEmptyString(body.education, 2, 150)) {
      errors.push('education must be between 2 and 150 characters');
    } else {
      updates.education = body.education.trim();
    }
  }

  if (body.targetRoleId !== undefined) {
    if (!isNonEmptyString(body.targetRoleId, 2, 80)) {
      errors.push('targetRoleId must be a non-empty string');
    } else if (roleCatalog.length > 0 && !roleCatalog.some((r) => r.id === body.targetRoleId)) {
      errors.push(`targetRoleId "${body.targetRoleId}" is not recognized in the role catalog`);
    } else {
      updates.targetRoleId = body.targetRoleId.trim();
    }
  }

  if (body.interests !== undefined) {
    if (!Array.isArray(body.interests) && typeof body.interests !== 'string') {
      errors.push('interests must be an array of strings or a comma-delimited string');
    } else {
      updates.interests = Array.isArray(body.interests)
        ? body.interests.map((i) => String(i).trim()).filter(Boolean)
        : body.interests.split(',').map((i) => i.trim()).filter(Boolean);
    }
  }

  if (body.bio !== undefined) {
    if (typeof body.bio !== 'string' || body.bio.length > 1000) {
      errors.push('bio must be a string up to 1000 characters');
    } else {
      updates.bio = body.bio.trim();
    }
  }

  if (errors.length > 0) {
    throw new AppError('User profile update validation failed', 400, 'VALIDATION_ERROR', errors);
  }

  return updates;
}
