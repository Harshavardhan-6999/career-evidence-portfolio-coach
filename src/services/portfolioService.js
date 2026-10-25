/**
 * Module 7: Portfolio Selection, Ordering, and Assembly
 * Owner: T. Nikhil (25071A66D6)
 *
 * Handles user portfolio upsertion, ordered evidence selection, reference validation,
 * and complete assembled portfolio view generation using MongoDB.
 */

import mongoose from 'mongoose';
import { Portfolio } from '../models/Portfolio.js';
import { Evidence } from '../models/Evidence.js';
import { SkillMapping } from '../models/SkillMapping.js';
import { User } from '../models/User.js';
import { AppError } from '../validators/commonValidators.js';
import { getSkills } from './skillService.js';
import { getRoleById } from './roleService.js';
import { buildUserFilter } from './userService.js';
import { buildEvidenceFilter } from './evidenceService.js';
import { isDbConnected } from '../storage/db.js';

/**
 * Upserts a user's single career portfolio.
 * Validates that all selected evidence IDs exist and strictly belong to the user.
 *
 * @param {string} userId
 * @param {object} payload
 * @param {string} payload.title
 * @param {string[]} payload.selectedEvidenceIds
 */
export async function upsertPortfolio(userId, { title, selectedEvidenceIds }) {
  if (!isDbConnected()) {
    throw new AppError('Database connection unavailable. Please check MONGODB_URI.', 503, 'DATABASE_UNAVAILABLE');
  }

  const user = await User.findOne(buildUserFilter(userId));
  if (!user) {
    throw new AppError(`User profile with ID "${userId}" not found`, 404, 'NOT_FOUND');
  }

  // Validate all selected evidence items exist and belong to this user
  const validatedEvidenceIds = [];
  const invalidIds = [];
  const foreignIds = [];

  for (const evId of selectedEvidenceIds) {
    const ownEv = await Evidence.findOne(buildEvidenceFilter(evId, user._id));
    if (ownEv) {
      validatedEvidenceIds.push(ownEv._id);
    } else {
      const foreignEv = await Evidence.findOne(buildEvidenceFilter(evId));
      if (foreignEv) {
        foreignIds.push(evId);
      } else {
        invalidIds.push(evId);
      }
    }
  }

  if (invalidIds.length > 0 || foreignIds.length > 0) {
    const details = [];
    if (invalidIds.length > 0) details.push(`Evidence IDs do not exist: ${invalidIds.join(', ')}`);
    if (foreignIds.length > 0) details.push(`Evidence IDs belong to another user: ${foreignIds.join(', ')}`);
    throw new AppError('Invalid evidence IDs in portfolio selection', 400, 'VALIDATION_ERROR', details);
  }

  let portfolio = await Portfolio.findOne({ userId: user._id });
  if (portfolio) {
    portfolio.title = title;
    portfolio.selectedEvidenceIds = validatedEvidenceIds;
    await portfolio.save();
  } else {
    portfolio = await Portfolio.create({
      userId: user._id,
      title,
      selectedEvidenceIds: validatedEvidenceIds
    });
  }

  return portfolio.toJSON();
}

/**
 * Retrieves and assembles the complete career portfolio for a user.
 * Preserves the exact ordering of selected evidence specified by the user.
 *
 * @param {string} userId
 */
export async function getAssembledPortfolio(userId) {
  if (!isDbConnected()) {
    throw new AppError('Database connection unavailable. Please check MONGODB_URI.', 503, 'DATABASE_UNAVAILABLE');
  }

  const user = await User.findOne(buildUserFilter(userId));
  if (!user) {
    throw new AppError(`User profile with ID "${userId}" not found`, 404, 'NOT_FOUND');
  }

  const portfolio = await Portfolio.findOne({ userId: user._id });
  if (!portfolio) {
    throw new AppError(
      `Portfolio not found for user "${userId}". Create one with PUT /api/users/${userId}/portfolio`,
      404,
      'NOT_FOUND'
    );
  }

  const role = await getRoleById(user.targetRoleId);
  const catalog = await getSkills();
  const catalogMap = new Map(catalog.map((s) => [s.id, s.name]));

  // Fetch all selected evidence items
  const evidenceList = await Evidence.find({ _id: { $in: portfolio.selectedEvidenceIds } });
  const evidenceMap = new Map(evidenceList.map((e) => [e._id.toString(), e]));

  // Fetch mappings for these evidence items
  const mappings = await SkillMapping.find({
    userId: user._id,
    evidenceId: { $in: portfolio.selectedEvidenceIds }
  });

  const mappingsByEvidenceId = new Map();
  for (const m of mappings) {
    const key = m.evidenceId.toString();
    if (!mappingsByEvidenceId.has(key)) {
      mappingsByEvidenceId.set(key, []);
    }
    mappingsByEvidenceId.get(key).push({
      skillId: m.skillId,
      skillName: catalogMap.get(m.skillId) || m.skillId
    });
  }

  // Preserve EXACT order of selectedEvidenceIds
  const assembledEvidence = [];
  const uniqueSkillsInPortfolio = new Map();

  for (const idObj of portfolio.selectedEvidenceIds) {
    const evIdStr = idObj.toString();
    const ev = evidenceMap.get(evIdStr);
    if (!ev) continue;

    const mappedSkills = mappingsByEvidenceId.get(evIdStr) || [];
    for (const sk of mappedSkills) {
      if (!uniqueSkillsInPortfolio.has(sk.skillId)) {
        uniqueSkillsInPortfolio.set(sk.skillId, {
          skillId: sk.skillId,
          skillName: sk.skillName,
          evidenceCount: 0
        });
      }
      uniqueSkillsInPortfolio.get(sk.skillId).evidenceCount += 1;
    }

    assembledEvidence.push({
      id: ev._id.toString(),
      type: ev.type,
      title: ev.title,
      description: ev.description,
      date: ev.date,
      supportingUrl: ev.supportingUrl,
      mappedSkills
    });
  }

  return {
    id: portfolio._id.toString(),
    userId: user._id.toString(),
    title: portfolio.title,
    createdAt: portfolio.createdAt,
    updatedAt: portfolio.updatedAt,
    user: {
      id: user._id.toString(),
      name: user.name,
      education: user.education,
      targetRoleId: user.targetRoleId,
      targetRoleName: role ? role.name : user.targetRoleId,
      bio: user.bio
    },
    selectedEvidence: assembledEvidence,
    mappedSkillsSummary: Array.from(uniqueSkillsInPortfolio.values())
  };
}
