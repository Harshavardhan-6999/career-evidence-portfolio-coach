/**
 * Module 1: Role Gap Comparison Service
 * Owner: N. Tharun Kumar (25071A66B8)
 *
 * Compares target role expectations against user evidence-backed skills using MongoDB.
 * Strictly adheres to ethical guidelines: does not predict hiring probability
 * and explicitly includes educational disclaimers.
 */

import { User } from '../models/User.js';
import { Evidence } from '../models/Evidence.js';
import { SkillMapping } from '../models/SkillMapping.js';
import { AppError } from '../validators/commonValidators.js';
import { getRoleById } from './roleService.js';
import { getSkills } from './skillService.js';
import { buildUserFilter } from './userService.js';
import { isDbConnected } from '../storage/db.js';

export const ROLE_GAP_DISCLAIMER =
  'Missing evidence does not prove lack of ability. This analysis only reflects skills mapped to recorded evidence and does not predict hiring success or job readiness.';

/**
 * Computes evidence coverage and gaps for a student's target role.
 *
 * @param {string} userId
 * @param {string} [overrideRoleId] Optional roleId override (defaults to user.targetRoleId)
 */
export async function computeRoleGap(userId, overrideRoleId = null) {
  if (!isDbConnected()) {
    throw new AppError('Database connection unavailable. Please check MONGODB_URI.', 503, 'DATABASE_UNAVAILABLE');
  }

  const user = await User.findOne(buildUserFilter(userId));
  if (!user) {
    throw new AppError(`User profile with ID "${userId}" not found`, 404, 'NOT_FOUND');
  }

  const roleIdToCompare = overrideRoleId || user.targetRoleId;
  const targetRole = await getRoleById(roleIdToCompare);
  if (!targetRole) {
    throw new AppError(`Role "${roleIdToCompare}" not found in role catalog`, 404, 'NOT_FOUND');
  }

  const catalog = await getSkills();
  const catalogMap = new Map(catalog.map((s) => [s.id, s.name]));

  // Get user's evidence mappings with populated evidence
  const userMappings = await SkillMapping.find({ userId: user._id }).populate('evidenceId');

  // Group evidence by skill
  const evidenceBySkillId = new Map();
  for (const m of userMappings) {
    const ev = m.evidenceId;
    if (!ev) continue;

    if (!evidenceBySkillId.has(m.skillId)) {
      evidenceBySkillId.set(m.skillId, []);
    }
    evidenceBySkillId.get(m.skillId).push({
      evidenceId: ev._id.toString(),
      title: ev.title,
      type: ev.type,
      date: ev.date
    });
  }

  const skillsWithEvidence = [];
  const skillsLackingEvidence = [];

  for (const skillId of targetRole.expectedSkillIds) {
    const skillName = catalogMap.get(skillId) || skillId;
    const supporting = evidenceBySkillId.get(skillId) || [];

    if (supporting.length > 0) {
      skillsWithEvidence.push({
        skillId,
        skillName,
        supportingEvidence: supporting
      });
    } else {
      skillsLackingEvidence.push({
        skillId,
        skillName
      });
    }
  }

  return {
    userId: user._id.toString(),
    roleName: targetRole.name,
    targetRole: {
      id: targetRole.id,
      name: targetRole.name,
      description: targetRole.description
    },
    skillsWithEvidence,
    skillsLackingEvidence,
    summary: {
      totalExpectedSkills: targetRole.expectedSkillIds.length,
      skillsWithEvidenceCount: skillsWithEvidence.length,
      skillsLackingEvidenceCount: skillsLackingEvidence.length
    },
    disclaimer: ROLE_GAP_DISCLAIMER
  };
}
