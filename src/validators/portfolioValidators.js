/**
 * Module 9: Portfolio Validators
 * Owner: P. Sasikanth (25071A66C3)
 */

import { AppError, isNonEmptyString, isValidUUID } from './commonValidators.js';

/**
 * Validates payload for upserting a user's portfolio.
 * @param {object} body
 */
export function validateUpsertPortfolio(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError('Request body must be a JSON object', 400, 'VALIDATION_ERROR');
  }

  const { title, selectedEvidenceIds } = body;
  const errors = [];

  if (!isNonEmptyString(title, 2, 150)) {
    errors.push('title is required and must be between 2 and 150 characters');
  }

  if (!Array.isArray(selectedEvidenceIds)) {
    errors.push('selectedEvidenceIds is required and must be an array of evidence UUIDs');
  } else {
    // Check for duplicate evidence IDs
    const seen = new Set();
    const duplicates = [];

    for (let i = 0; i < selectedEvidenceIds.length; i++) {
      const id = selectedEvidenceIds[i];
      if (!isValidUUID(id)) {
        errors.push(`selectedEvidenceIds[${i}] "${id}" is not a valid UUID`);
      } else {
        if (seen.has(id)) {
          duplicates.push(id);
        }
        seen.add(id);
      }
    }

    if (duplicates.length > 0) {
      errors.push(`Duplicate evidence IDs found in selection: ${Array.from(new Set(duplicates)).join(', ')}`);
    }
  }

  if (errors.length > 0) {
    throw new AppError('Portfolio validation failed', 400, 'VALIDATION_ERROR', errors);
  }

  return {
    title: title.trim(),
    selectedEvidenceIds: selectedEvidenceIds.map((id) => id.trim())
  };
}
