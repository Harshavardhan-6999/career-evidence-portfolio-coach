/**
 * Module 5: Evidence Service and Cascade Operations
 * Owner: T. Jaswanth (25071A66D5)
 *
 * Handles projects, certifications, and internships evidence lifecycle in MongoDB.
 * Enforces cascading deletion of skill mappings and portfolio references.
 */

import mongoose from 'mongoose';
import { Evidence } from '../models/Evidence.js';
import { SkillMapping } from '../models/SkillMapping.js';
import { Portfolio } from '../models/Portfolio.js';
import { User } from '../models/User.js';
import { AppError } from '../validators/commonValidators.js';
import { buildUserFilter } from './userService.js';
import { isDbConnected } from '../storage/db.js';

/**
 * Helper to build evidence query filter supporting ObjectId or legacy UUID.
 * @param {string} evidenceId
 * @param {mongoose.Types.ObjectId} [userId]
 */
export function buildEvidenceFilter(evidenceId, userId = null) {
  const filter = {};
  if (mongoose.Types.ObjectId.isValid(evidenceId)) {
    filter.$or = [{ _id: evidenceId }, { legacyId: evidenceId }];
  } else {
    filter.legacyId = evidenceId;
  }
  if (userId) {
    filter.userId = userId;
  }
  return filter;
}

/**
 * Creates an evidence record for a user.
 * @param {string} userId
 * @param {object} payload
 */
export async function createEvidence(userId, payload) {
  if (!isDbConnected()) {
    throw new AppError('Database connection unavailable. Please check MONGODB_URI.', 503, 'DATABASE_UNAVAILABLE');
  }

  const user = await User.findOne(buildUserFilter(userId));
  if (!user) {
    throw new AppError(`User profile with ID "${userId}" not found`, 404, 'NOT_FOUND');
  }

  const evidence = await Evidence.create({
    userId: user._id,
    type: payload.type,
    title: payload.title,
    description: payload.description,
    date: payload.date,
    supportingUrl: payload.supportingUrl || null
  });

  return evidence.toJSON();
}

/**
 * Lists all evidence records owned by a user.
 * @param {string} userId
 * @param {object} [filters]
 * @param {string} [filters.type]
 */
export async function listEvidence(userId, filters = {}) {
  if (!isDbConnected()) {
    throw new AppError('Database connection unavailable. Please check MONGODB_URI.', 503, 'DATABASE_UNAVAILABLE');
  }

  const user = await User.findOne(buildUserFilter(userId));
  if (!user) {
    throw new AppError(`User profile with ID "${userId}" not found`, 404, 'NOT_FOUND');
  }

  const query = { userId: user._id };
  if (filters.type) {
    query.type = filters.type;
  }

  const items = await Evidence.find(query).sort({ createdAt: -1 });
  return items.map((i) => i.toJSON());
}

/**
 * Retrieves a single evidence record by ID.
 * @param {string} userId
 * @param {string} evidenceId
 */
export async function getEvidenceById(userId, evidenceId) {
  if (!isDbConnected()) {
    throw new AppError('Database connection unavailable. Please check MONGODB_URI.', 503, 'DATABASE_UNAVAILABLE');
  }

  const user = await User.findOne(buildUserFilter(userId));
  if (!user) {
    throw new AppError(`User profile with ID "${userId}" not found`, 404, 'NOT_FOUND');
  }

  const ev = await Evidence.findOne(buildEvidenceFilter(evidenceId, user._id));
  if (!ev) {
    throw new AppError(`Evidence record with ID "${evidenceId}" not found for this user`, 404, 'NOT_FOUND');
  }

  const mappings = await SkillMapping.find({ evidenceId: ev._id });
  const result = ev.toJSON();
  result.mappedSkillIds = mappings.map((m) => m.skillId);
  return result;
}

/**
 * Updates an existing evidence item (PATCH).
 * @param {string} userId
 * @param {string} evidenceId
 * @param {object} updates
 */
export async function updateEvidence(userId, evidenceId, updates) {
  if (!isDbConnected()) {
    throw new AppError('Database connection unavailable. Please check MONGODB_URI.', 503, 'DATABASE_UNAVAILABLE');
  }

  const user = await User.findOne(buildUserFilter(userId));
  if (!user) {
    throw new AppError(`User profile with ID "${userId}" not found`, 404, 'NOT_FOUND');
  }

  const ev = await Evidence.findOne(buildEvidenceFilter(evidenceId, user._id));
  if (!ev) {
    throw new AppError(`Evidence record with ID "${evidenceId}" not found for this user`, 404, 'NOT_FOUND');
  }

  if (updates.type !== undefined) ev.type = updates.type;
  if (updates.title !== undefined) ev.title = updates.title;
  if (updates.description !== undefined) ev.description = updates.description;
  if (updates.date !== undefined) ev.date = updates.date;
  if (updates.supportingUrl !== undefined) ev.supportingUrl = updates.supportingUrl;

  await ev.save();
  return ev.toJSON();
}

/**
 * Deletes an evidence item and cascades cleanup:
 * 1. Deletes evidence record
 * 2. Deletes all skill mappings for this evidence
 * 3. Removes evidence reference from user's portfolio selectedEvidenceIds
 *
 * @param {string} userId
 * @param {string} evidenceId
 */
export async function deleteEvidence(userId, evidenceId) {
  if (!isDbConnected()) {
    throw new AppError('Database connection unavailable. Please check MONGODB_URI.', 503, 'DATABASE_UNAVAILABLE');
  }

  const user = await User.findOne(buildUserFilter(userId));
  if (!user) {
    throw new AppError(`User profile with ID "${userId}" not found`, 404, 'NOT_FOUND');
  }

  const ev = await Evidence.findOne(buildEvidenceFilter(evidenceId, user._id));
  if (!ev) {
    throw new AppError(`Evidence record with ID "${evidenceId}" not found for this user`, 404, 'NOT_FOUND');
  }

  // 1. Remove evidence
  await Evidence.findByIdAndDelete(ev._id);

  // 2. Cascade delete skill mappings
  const mappingDeleteResult = await SkillMapping.deleteMany({ evidenceId: ev._id });

  // 3. Remove from portfolio selection
  const portfolioUpdate = await Portfolio.updateOne(
    { userId: user._id, selectedEvidenceIds: ev._id },
    { $pull: { selectedEvidenceIds: ev._id } }
  );

  return {
    message: 'Evidence record and associated references deleted successfully',
    evidenceId,
    removedMappingsCount: mappingDeleteResult.deletedCount || 0,
    removedFromPortfolio: (portfolioUpdate.modifiedCount || 0) > 0
  };
}
