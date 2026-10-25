/**
 * Module 8: Coaching Service and Feedback Orchestration
 * Owner: R. Suryaprakash (25071A66C5)
 *
 * Coordinates AI coaching feedback, deterministic rule fallback,
 * snapshots inputs, stores evaluations in MongoDB, and computes staleness.
 */

import { CoachingResult } from '../models/CoachingResult.js';
import { User } from '../models/User.js';
import { AppError } from '../validators/commonValidators.js';
import { getRoleById } from './roleService.js';
import { getSkills } from './skillService.js';
import { getAssembledPortfolio } from './portfolioService.js';
import { generateStructuredJson, isAiConfigured, isAiStubbed } from '../ai/aiClient.js';
import {
  COACHING_SCHEMA,
  COACHING_SYSTEM_INSTRUCTION,
  buildCoachingPrompt
} from '../ai/prompts/coachingPrompt.js';
import { validateAiCoachingOutput } from '../validators/aiOutputValidators.js';
import { generateRuleBasedCoaching } from './rulesCoachingService.js';
import { buildUserFilter } from './userService.js';
import { isDbConnected } from '../storage/db.js';

/**
 * Builds a deterministic snapshot of relevant inputs for staleness detection.
 */
function createInputSnapshot(user, portfolio) {
  const selectedEvidenceIds = portfolio.selectedEvidence.map((e) => e.id);
  const mappedSkillIds = Array.from(
    new Set(
      portfolio.selectedEvidence.flatMap((e) => e.mappedSkills.map((m) => m.skillId))
    )
  ).sort();

  return {
    targetRoleId: user.targetRoleId,
    portfolioId: portfolio.id,
    portfolioUpdatedAt: portfolio.updatedAt,
    selectedEvidenceIds,
    mappedSkillIds
  };
}

/**
 * Generates coaching feedback for a user's assembled portfolio.
 * Calls Gemini AI when available; falls back gracefully to labeled rules.
 *
 * @param {string} userId
 */
export async function generateCoaching(userId) {
  if (!isDbConnected()) {
    throw new AppError('Database connection unavailable. Please check MONGODB_URI.', 503, 'DATABASE_UNAVAILABLE');
  }

  const user = await User.findOne(buildUserFilter(userId));
  if (!user) {
    throw new AppError(`User profile with ID "${userId}" not found`, 404, 'NOT_FOUND');
  }

  const portfolio = await getAssembledPortfolio(userId);
  if (!portfolio.selectedEvidence || portfolio.selectedEvidence.length === 0) {
    throw new AppError(
      'Portfolio must contain at least one selected evidence item before coaching can be generated',
      400,
      'VALIDATION_ERROR'
    );
  }

  const role = await getRoleById(user.targetRoleId);
  if (!role) {
    throw new AppError(`Target role "${user.targetRoleId}" not found`, 404, 'NOT_FOUND');
  }

  const catalog = await getSkills();
  const catalogMap = new Map(catalog.map((s) => [s.id, s.name]));
  const expectedSkills = role.expectedSkillIds.map((id) => ({
    id,
    name: catalogMap.get(id) || id
  }));

  const inputSnapshot = createInputSnapshot(user, portfolio);
  let feedback;

  // Attempt live AI generation first
  try {
    const prompt = buildCoachingPrompt({
      targetRoleName: role.name,
      expectedSkillNames: expectedSkills.map((s) => s.name),
      portfolioTitle: portfolio.title,
      selectedEvidence: portfolio.selectedEvidence.map((e) => ({
        ...e,
        mappedSkills: e.mappedSkills.map((m) => m.skillName)
      }))
    });

    const aiRaw = await generateStructuredJson({
      systemInstruction: COACHING_SYSTEM_INSTRUCTION,
      prompt,
      schema: COACHING_SCHEMA
    });

    const validated = validateAiCoachingOutput(
      aiRaw,
      portfolio.selectedEvidence.map((e) => e.id)
    );

    const roadmap = validated.nextSteps.map((step, idx) => ({
      id: `task-${idx + 1}`,
      task: step.action,
      reason: step.reason,
      priority: step.priority,
      status: 'todo',
      supportingEvidenceIds: step.supportingEvidenceIds || []
    }));

    feedback = {
      source: 'ai',
      aiStatus: 'success',
      ...validated,
      roadmap
    };
  } catch (aiErr) {
    const hasActiveAi = isAiConfigured() || isAiStubbed();
    const aiStatus = hasActiveAi ? 'failed' : 'unavailable';
    feedback = generateRuleBasedCoaching({
      targetRoleName: role.name,
      expectedSkills,
      selectedEvidence: portfolio.selectedEvidence,
      aiStatus
    });
  }

  // Save feedback in MongoDB
  const record = await CoachingResult.create({
    userId: user._id,
    portfolioId: portfolio.id,
    source: feedback.source,
    aiStatus: feedback.aiStatus,
    strengths: feedback.strengths,
    evidenceGaps: feedback.evidenceGaps,
    nextSteps: feedback.nextSteps,
    roadmap: feedback.roadmap || [],
    inputSnapshot
  });

  return record.toJSON();
}

/**
 * Retrieves the latest coaching feedback for a user and calculates staleness.
 *
 * @param {string} userId
 */
export async function getLatestCoaching(userId) {
  if (!isDbConnected()) {
    throw new AppError('Database connection unavailable. Please check MONGODB_URI.', 503, 'DATABASE_UNAVAILABLE');
  }

  const user = await User.findOne(buildUserFilter(userId));
  if (!user) {
    throw new AppError(`User profile with ID "${userId}" not found`, 404, 'NOT_FOUND');
  }

  const latest = await CoachingResult.findOne({ userId: user._id }).sort({ createdAt: -1 });

  if (!latest) {
    throw new AppError(
      `No coaching feedback found for user "${userId}". Generate one via POST /api/users/${userId}/coaching`,
      404,
      'NOT_FOUND'
    );
  }

  // Calculate staleness against current state
  const staleReasons = [];

  // 1. Did target role change?
  if (latest.inputSnapshot?.targetRoleId && latest.inputSnapshot.targetRoleId !== user.targetRoleId) {
    staleReasons.push(`Target role changed from "${latest.inputSnapshot.targetRoleId}" to "${user.targetRoleId}"`);
  }

  // 2. Did portfolio change?
  let currentPortfolio = null;
  try {
    currentPortfolio = await getAssembledPortfolio(userId);
  } catch {
    staleReasons.push('Portfolio has been modified or removed since coaching evaluation');
  }

  if (currentPortfolio && latest.inputSnapshot) {
    const currentSelectedIds = currentPortfolio.selectedEvidence.map((e) => e.id);
    const snapshotSelectedIds = (latest.inputSnapshot.selectedEvidenceIds || []).map((id) => id.toString());

    if (
      currentSelectedIds.length !== snapshotSelectedIds.length ||
      currentSelectedIds.some((id, idx) => id !== snapshotSelectedIds[idx])
    ) {
      staleReasons.push('Portfolio evidence selection or ordering has changed');
    }

    const currentSkillIds = Array.from(
      new Set(
        currentPortfolio.selectedEvidence.flatMap((e) => e.mappedSkills.map((m) => m.skillId))
      )
    ).sort();
    const snapshotSkillIds = (latest.inputSnapshot.mappedSkillIds || []).sort();

    if (
      currentSkillIds.length !== snapshotSkillIds.length ||
      currentSkillIds.some((id, idx) => id !== snapshotSkillIds[idx])
    ) {
      staleReasons.push('Skill mappings on portfolio evidence have changed');
    }
  }

  const result = latest.toJSON();
  result.isStale = staleReasons.length > 0;
  result.staleReasons = staleReasons;
  return result;
}

/**
 * Update the completion status of a roadmap task.
 * @param {string} userId
 * @param {string} coachingId
 * @param {string} taskId
 * @param {'todo' | 'in_progress' | 'completed'} status
 */
export async function updateRoadmapTaskStatus(userId, coachingId, taskId, status) {
  if (!isDbConnected()) {
    throw new AppError('Database connection unavailable. Please check MONGODB_URI.', 503, 'DATABASE_UNAVAILABLE');
  }

  const validStatuses = ['todo', 'in_progress', 'completed'];
  if (!validStatuses.includes(status)) {
    throw new AppError(`Status must be one of: ${validStatuses.join(', ')}`, 400, 'VALIDATION_ERROR');
  }

  const user = await User.findOne(buildUserFilter(userId));
  if (!user) {
    throw new AppError(`User profile with ID "${userId}" not found`, 404, 'NOT_FOUND');
  }

  const coaching = await CoachingResult.findOne({ _id: coachingId, userId: user._id });
  if (!coaching) {
    throw new AppError('Coaching record not found', 404, 'NOT_FOUND');
  }

  const task = coaching.roadmap.find((t) => t.id === taskId);
  if (!task) {
    throw new AppError(`Roadmap task "${taskId}" not found`, 404, 'NOT_FOUND');
  }

  task.status = status;
  await coaching.save();

  return coaching.toJSON();
}
