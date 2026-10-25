/**
 * Module 9: Evidence Validators
 * Owner: P. Sasikanth (25071A66C3)
 */

import { AppError, isNonEmptyString, isValidDate, isValidUrl } from './commonValidators.js';

export const ALLOWED_EVIDENCE_TYPES = Object.freeze(['project', 'certification', 'internship']);

/**
 * Validates payload for creating a new evidence item.
 * @param {object} body
 */
export function validateCreateEvidence(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError('Request body must be a JSON object', 400, 'VALIDATION_ERROR');
  }

  const { type, title, description, date, supportingUrl } = body;
  const errors = [];

  if (!type || !ALLOWED_EVIDENCE_TYPES.includes(type)) {
    errors.push(`type is required and must be one of: ${ALLOWED_EVIDENCE_TYPES.join(', ')}`);
  }

  if (!isNonEmptyString(title, 2, 150)) {
    errors.push('title is required and must be between 2 and 150 characters');
  }

  if (!isNonEmptyString(description, 5, 3000)) {
    errors.push('description is required and must be between 5 and 3000 characters');
  }

  if (!isValidDate(date)) {
    errors.push('date is required and must be a valid date format (e.g. YYYY-MM-DD or ISO)');
  }

  if (supportingUrl !== undefined && supportingUrl !== null && supportingUrl !== '') {
    if (!isValidUrl(supportingUrl)) {
      errors.push('supportingUrl must be a valid HTTP or HTTPS URL');
    }
  }

  if (errors.length > 0) {
    throw new AppError('Evidence validation failed', 400, 'VALIDATION_ERROR', errors);
  }

  return {
    type,
    title: title.trim(),
    description: description.trim(),
    date: date.trim(),
    supportingUrl: supportingUrl && supportingUrl.trim() ? supportingUrl.trim() : null
  };
}

/**
 * Validates payload for updating an existing evidence item (PATCH).
 * @param {object} body
 */
export function validateUpdateEvidence(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError('Request body must be a JSON object', 400, 'VALIDATION_ERROR');
  }

  const allowedFields = ['type', 'title', 'description', 'date', 'supportingUrl'];
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

  if (body.type !== undefined) {
    if (!ALLOWED_EVIDENCE_TYPES.includes(body.type)) {
      errors.push(`type must be one of: ${ALLOWED_EVIDENCE_TYPES.join(', ')}`);
    } else {
      updates.type = body.type;
    }
  }

  if (body.title !== undefined) {
    if (!isNonEmptyString(body.title, 2, 150)) {
      errors.push('title must be between 2 and 150 characters');
    } else {
      updates.title = body.title.trim();
    }
  }

  if (body.description !== undefined) {
    if (!isNonEmptyString(body.description, 5, 3000)) {
      errors.push('description must be between 5 and 3000 characters');
    } else {
      updates.description = body.description.trim();
    }
  }

  if (body.date !== undefined) {
    if (!isValidDate(body.date)) {
      errors.push('date must be a valid date format (e.g. YYYY-MM-DD or ISO)');
    } else {
      updates.date = body.date.trim();
    }
  }

  if (body.supportingUrl !== undefined) {
    if (body.supportingUrl === null || body.supportingUrl === '') {
      updates.supportingUrl = null;
    } else if (!isValidUrl(body.supportingUrl)) {
      errors.push('supportingUrl must be a valid HTTP or HTTPS URL');
    } else {
      updates.supportingUrl = body.supportingUrl.trim();
    }
  }

  if (errors.length > 0) {
    throw new AppError('Evidence update validation failed', 400, 'VALIDATION_ERROR', errors);
  }

  return updates;
}
