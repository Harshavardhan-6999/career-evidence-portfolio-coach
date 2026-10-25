/**
 * Module 9: AI Output Schema and Semantic Validators
 * Owner: P. Sasikanth (25071A66C3)
 *
 * Validates AI structured outputs both syntactically and semantically.
 * Ensures AI responses do not invent catalog skills or reference out-of-scope evidence IDs.
 */

import { AppError } from './commonValidators.js';

const ALLOWED_PRIORITIES = new Set(['high', 'medium', 'low']);

/**
 * Validates AI output for evidence skill analysis.
 * Schema: { suggestedSkills: [{ skillId, evidenceId, reason }] }
 *
 * @param {any} rawOutput
 * @param {string} targetEvidenceId
 * @param {Array<{id: string}>} catalogSkills
 * @returns {{ suggestedSkills: Array<{skillId: string, evidenceId: string, reason: string}> }}
 */
export function validateAiSkillAnalysisOutput(rawOutput, targetEvidenceId, catalogSkills = []) {
  if (!rawOutput || typeof rawOutput !== 'object') {
    throw new AppError('AI response is not a valid JSON object', 502, 'AI_INVALID_OUTPUT');
  }

  const { suggestedSkills } = rawOutput;
  if (!Array.isArray(suggestedSkills)) {
    throw new AppError('AI response missing suggestedSkills array', 502, 'AI_INVALID_OUTPUT');
  }

  const validSkillIds = new Set(catalogSkills.map((s) => s.id));
  const sanitized = [];

  for (let i = 0; i < suggestedSkills.length; i++) {
    const item = suggestedSkills[i];
    if (!item || typeof item !== 'object') {
      throw new AppError(`suggestedSkills[${i}] is not an object`, 502, 'AI_INVALID_OUTPUT');
    }

    const { skillId, evidenceId, reason } = item;

    if (typeof skillId !== 'string' || !validSkillIds.has(skillId.trim())) {
      throw new AppError(
        `AI suggested unrecognized skillId "${skillId}" at index ${i}`,
        502,
        'AI_SEMANTIC_VIOLATION'
      );
    }

    if (typeof evidenceId !== 'string' || evidenceId.trim() !== targetEvidenceId) {
      throw new AppError(
        `AI returned mismatched evidenceId "${evidenceId}" (expected "${targetEvidenceId}") at index ${i}`,
        502,
        'AI_SEMANTIC_VIOLATION'
      );
    }

    if (typeof reason !== 'string' || reason.trim().length < 3) {
      throw new AppError(
        `AI returned empty or invalid reason at index ${i}`,
        502,
        'AI_INVALID_OUTPUT'
      );
    }

    sanitized.push({
      skillId: skillId.trim(),
      evidenceId: targetEvidenceId,
      reason: reason.trim()
    });
  }

  return { suggestedSkills: sanitized };
}

/**
 * Validates AI output for career portfolio coaching.
 * Schema:
 *   strengths: [{ statement, supportingEvidenceIds }]
 *   evidenceGaps: [{ statement, supportingEvidenceIds }]
 *   nextSteps: [{ action, reason, priority, supportingEvidenceIds }]
 *
 * @param {any} rawOutput
 * @param {Array<string>} allowedEvidenceIds Evidence IDs in the submitted portfolio
 * @returns {{ strengths: Array, evidenceGaps: Array, nextSteps: Array }}
 */
export function validateAiCoachingOutput(rawOutput, allowedEvidenceIds = []) {
  if (!rawOutput || typeof rawOutput !== 'object') {
    throw new AppError('AI coaching response is not a valid JSON object', 502, 'AI_INVALID_OUTPUT');
  }

  const { strengths, evidenceGaps, nextSteps } = rawOutput;

  if (!Array.isArray(strengths) || !Array.isArray(evidenceGaps) || !Array.isArray(nextSteps)) {
    throw new AppError(
      'AI coaching response missing strengths, evidenceGaps, or nextSteps arrays',
      502,
      'AI_INVALID_OUTPUT'
    );
  }

  const allowedIdSet = new Set(allowedEvidenceIds);

  /**
   * Helper to ensure all IDs in list belong strictly to allowed portfolio evidence.
   */
  const validateSupportingIds = (idList, contextLabel) => {
    if (!Array.isArray(idList)) {
      throw new AppError(`${contextLabel}: supportingEvidenceIds must be an array`, 502, 'AI_INVALID_OUTPUT');
    }
    const cleanList = [];
    for (const id of idList) {
      if (typeof id !== 'string') {
        throw new AppError(`${contextLabel}: supportingEvidenceIds contains non-string ID`, 502, 'AI_INVALID_OUTPUT');
      }
      const trimmed = id.trim();
      if (!allowedIdSet.has(trimmed)) {
        throw new AppError(
          `${contextLabel}: supportingEvidenceId "${trimmed}" does not belong to user's selected portfolio evidence`,
          502,
          'AI_SEMANTIC_VIOLATION'
        );
      }
      cleanList.push(trimmed);
    }
    return Array.from(new Set(cleanList));
  };

  // 1. Validate strengths
  const cleanStrengths = strengths.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new AppError(`strengths[${index}] must be an object`, 502, 'AI_INVALID_OUTPUT');
    }
    if (typeof item.statement !== 'string' || item.statement.trim().length < 5) {
      throw new AppError(`strengths[${index}].statement is invalid or too short`, 502, 'AI_INVALID_OUTPUT');
    }
    const supportingIds = validateSupportingIds(item.supportingEvidenceIds || [], `strengths[${index}]`);
    return {
      statement: item.statement.trim(),
      supportingEvidenceIds: supportingIds
    };
  });

  // 2. Validate evidence gaps
  const cleanEvidenceGaps = evidenceGaps.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new AppError(`evidenceGaps[${index}] must be an object`, 502, 'AI_INVALID_OUTPUT');
    }
    if (typeof item.statement !== 'string' || item.statement.trim().length < 5) {
      throw new AppError(`evidenceGaps[${index}].statement is invalid or too short`, 502, 'AI_INVALID_OUTPUT');
    }
    const supportingIds = validateSupportingIds(item.supportingEvidenceIds || [], `evidenceGaps[${index}]`);
    return {
      statement: item.statement.trim(),
      supportingEvidenceIds: supportingIds
    };
  });

  // 3. Validate next steps
  const cleanNextSteps = nextSteps.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new AppError(`nextSteps[${index}] must be an object`, 502, 'AI_INVALID_OUTPUT');
    }
    if (typeof item.action !== 'string' || item.action.trim().length < 5) {
      throw new AppError(`nextSteps[${index}].action is invalid or too short`, 502, 'AI_INVALID_OUTPUT');
    }
    if (typeof item.reason !== 'string' || item.reason.trim().length < 5) {
      throw new AppError(`nextSteps[${index}].reason is invalid or too short`, 502, 'AI_INVALID_OUTPUT');
    }
    const priority = typeof item.priority === 'string' ? item.priority.toLowerCase().trim() : 'medium';
    if (!ALLOWED_PRIORITIES.has(priority)) {
      throw new AppError(
        `nextSteps[${index}].priority must be one of: high, medium, low`,
        502,
        'AI_INVALID_OUTPUT'
      );
    }
    const supportingIds = validateSupportingIds(item.supportingEvidenceIds || [], `nextSteps[${index}]`);
    return {
      action: item.action.trim(),
      reason: item.reason.trim(),
      priority,
      supportingEvidenceIds: supportingIds
    };
  });

  return {
    strengths: cleanStrengths,
    evidenceGaps: cleanEvidenceGaps,
    nextSteps: cleanNextSteps
  };
}
