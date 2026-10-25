/**
 * Authentication Validators
 * Validates registration and login inputs.
 */

import { AppError, isNonEmptyString } from './commonValidators.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates registration payload.
 * @param {object} body
 * @param {Array<{id: string}>} roleCatalog
 */
export function validateRegister(body, roleCatalog = []) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError('Request body must be a JSON object', 400, 'VALIDATION_ERROR');
  }

  const { name, email, password, education, targetRoleId, interests, bio } = body;
  const errors = [];

  if (!isNonEmptyString(name, 2, 100)) {
    errors.push('name is required and must be between 2 and 100 characters');
  }

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    errors.push('A valid email address is required');
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    errors.push('password is required and must be at least 8 characters long');
  }

  if (!isNonEmptyString(education, 2, 150)) {
    errors.push('education is required and must be between 2 and 150 characters');
  }

  if (!isNonEmptyString(targetRoleId, 2, 80)) {
    errors.push('targetRoleId is required and must be a non-empty string');
  } else if (roleCatalog.length > 0 && !roleCatalog.some((r) => r.id === targetRoleId)) {
    errors.push(`targetRoleId "${targetRoleId}" is not recognized in the role catalog`);
  }

  if (interests !== undefined && !Array.isArray(interests) && typeof interests !== 'string') {
    errors.push('interests must be an array of strings or comma-delimited string');
  }

  if (bio !== undefined && bio !== null && (typeof bio !== 'string' || bio.length > 1000)) {
    errors.push('bio must be a string up to 1000 characters');
  }

  if (errors.length > 0) {
    throw new AppError('Registration validation failed', 400, 'VALIDATION_ERROR', errors);
  }

  return {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password,
    education: education.trim(),
    targetRoleId: targetRoleId.trim(),
    interests: Array.isArray(interests)
      ? interests.map((i) => String(i).trim()).filter(Boolean)
      : typeof interests === 'string'
      ? interests.split(',').map((i) => i.trim()).filter(Boolean)
      : [],
    bio: bio ? bio.trim() : ''
  };
}

/**
 * Validates login payload.
 * @param {object} body
 */
export function validateLogin(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError('Request body must be a JSON object', 400, 'VALIDATION_ERROR');
  }

  const { email, password } = body;
  const errors = [];

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    errors.push('A valid email address is required');
  }

  if (!password || typeof password !== 'string' || password.length === 0) {
    errors.push('password is required');
  }

  if (errors.length > 0) {
    throw new AppError('Login validation failed', 400, 'VALIDATION_ERROR', errors);
  }

  return {
    email: email.trim().toLowerCase(),
    password
  };
}
