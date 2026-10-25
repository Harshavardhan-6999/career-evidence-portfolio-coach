/**
 * Module 9: Skill Mapping Validators
 * Owner: P. Sasikanth (25071A66C3)
 */

import { AppError, isNonEmptyString, isValidUUID } from './commonValidators.js';

/**
 * Validates payload for creating a skill mapping between catalog skill and evidence.
 * @param {object} body
 * @param {Array<{id: string}>} skillCatalog
 */
export function validateCreateSkillMapping(body, skillCatalog = []) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError('Request body must be a JSON object', 400, 'VALIDATION_ERROR');
  }

  const { skillId, evidenceId } = body;
  const errors = [];

  if (!isNonEmptyString(skillId, 1, 80)) {
    errors.push('skillId is required and must be a non-empty string');
  } else if (skillCatalog.length > 0 && !skillCatalog.some((s) => s.id === skillId)) {
    errors.push(`skillId "${skillId}" does not exist in the skill catalog`);
  }

  if (!isValidUUID(evidenceId)) {
    errors.push('evidenceId is required and must be a valid UUID');
  }

  if (errors.length > 0) {
    throw new AppError('Skill mapping validation failed', 400, 'VALIDATION_ERROR', errors);
  }

  return {
    skillId: skillId.trim(),
    evidenceId: evidenceId.trim()
  };
}
