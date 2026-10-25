/**
 * Module 6: Skills, Mappings, and AI Skill Suggestions
 * Owner: J. Sankarshan (25071A6698)
 *
 * Manages skill catalog, user evidence-skill linkages, and evidence skill extraction via AI
 * using MongoDB Mongoose models.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import { Skill } from '../models/Skill.js';
import { SkillMapping } from '../models/SkillMapping.js';
import { Evidence } from '../models/Evidence.js';
import { User } from '../models/User.js';
import { AppError } from '../validators/commonValidators.js';
import { buildUserFilter } from './userService.js';
import { buildEvidenceFilter } from './evidenceService.js';
import { isDbConnected } from '../storage/db.js';
import { generateStructuredJson } from '../ai/aiClient.js';
import {
  SKILL_ANALYSIS_SCHEMA,
  SKILL_ANALYSIS_SYSTEM_INSTRUCTION,
  buildSkillAnalysisPrompt
} from '../ai/prompts/skillAnalysisPrompt.js';
import { validateAiSkillAnalysisOutput } from '../validators/aiOutputValidators.js';

let fileSkillsCache = null;
const SKILLS_FILE_PATH = path.resolve(process.cwd(), 'data', 'skills.json');

async function getSkillsFromFile() {
  if (!fileSkillsCache) {
    const raw = await fs.readFile(SKILLS_FILE_PATH, 'utf8');
    fileSkillsCache = JSON.parse(raw);
  }
  return fileSkillsCache;
}

/**
 * Loads the static skill catalog from MongoDB or fallback file.
 * @returns {Promise<Array<{id: string, name: string}>>}
 */
export async function getSkills() {
  if (isDbConnected()) {
    try {
      const skills = await Skill.find({}).lean();
      if (skills.length > 0) {
        return skills.map((s) => ({ id: s.id, name: s.name }));
      }
    } catch {
      // Fall through to file fallback
    }
  }
  return getSkillsFromFile();
}

/**
 * Look up a specific skill by ID from the catalog.
 * @param {string} skillId
 * @returns {Promise<object|null>}
 */
export async function getSkillById(skillId) {
  if (isDbConnected()) {
    try {
      const skill = await Skill.findOne({ id: skillId }).lean();
      if (skill) {
        return { id: skill.id, name: skill.name };
      }
    } catch {
      // Fall through
    }
  }
  const skills = await getSkillsFromFile();
  return skills.find((s) => s.id === skillId) || null;
}

/**
 * Retrieve all catalog skills supported by a user's evidence, including mapped items.
 * @param {string} userId
 */
export async function getUserSkills(userId) {
  if (!isDbConnected()) {
    throw new AppError('Database connection unavailable. Please check MONGODB_URI.', 503, 'DATABASE_UNAVAILABLE');
  }

  const user = await User.findOne(buildUserFilter(userId));
  if (!user) {
    throw new AppError(`User profile with ID "${userId}" not found`, 404, 'NOT_FOUND');
  }

  const catalog = await getSkills();
  const catalogMap = new Map(catalog.map((s) => [s.id, s.name]));

  // Find all mappings for this user and populate evidence
  const userMappings = await SkillMapping.find({ userId: user._id }).populate('evidenceId');

  const skillEvidenceMap = new Map();
  for (const mapping of userMappings) {
    const ev = mapping.evidenceId;
    if (!ev) continue;

    if (!skillEvidenceMap.has(mapping.skillId)) {
      skillEvidenceMap.set(mapping.skillId, {
        skillId: mapping.skillId,
        skillName: catalogMap.get(mapping.skillId) || mapping.skillId,
        evidence: []
      });
    }

    skillEvidenceMap.get(mapping.skillId).evidence.push({
      mappingId: mapping._id.toString(),
      evidenceId: ev._id.toString(),
      title: ev.title,
      type: ev.type,
      date: ev.date
    });
  }

  return Array.from(skillEvidenceMap.values());
}

/**
 * Link a catalog skill to an evidence item owned by the user.
 * Enforces uniqueness and prevents cross-user mapping.
 * @param {string} userId
 * @param {{ skillId: string, evidenceId: string }} payload
 */
export async function createSkillMapping(userId, { skillId, evidenceId }) {
  if (!isDbConnected()) {
    throw new AppError('Database connection unavailable. Please check MONGODB_URI.', 503, 'DATABASE_UNAVAILABLE');
  }

  const catalog = await getSkills();
  const skillExists = catalog.some((s) => s.id === skillId);
  if (!skillExists) {
    throw new AppError(`Skill ID "${skillId}" does not exist in catalog`, 400, 'VALIDATION_ERROR');
  }

  const user = await User.findOne(buildUserFilter(userId));
  if (!user) {
    throw new AppError(`User profile with ID "${userId}" not found`, 404, 'NOT_FOUND');
  }

  const ev = await Evidence.findOne(buildEvidenceFilter(evidenceId, user._id));
  if (!ev) {
    // Check if evidence exists under another user
    const foreignEvidence = await Evidence.findOne(buildEvidenceFilter(evidenceId));
    if (foreignEvidence) {
      throw new AppError('Cannot map skill to evidence belonging to another user', 400, 'CROSS_USER_FORBIDDEN');
    }
    throw new AppError(`Evidence record with ID "${evidenceId}" not found`, 404, 'NOT_FOUND');
  }

  // Check duplicate mapping
  const existing = await SkillMapping.findOne({
    userId: user._id,
    skillId,
    evidenceId: ev._id
  });
  if (existing) {
    throw new AppError(`Skill "${skillId}" is already mapped to evidence "${evidenceId}"`, 409, 'CONFLICT');
  }

  const newMapping = await SkillMapping.create({
    userId: user._id,
    skillId,
    evidenceId: ev._id
  });

  return newMapping.toJSON();
}

/**
 * Delete a skill mapping by ID.
 * @param {string} userId
 * @param {string} mappingId
 */
export async function deleteSkillMapping(userId, mappingId) {
  if (!isDbConnected()) {
    throw new AppError('Database connection unavailable. Please check MONGODB_URI.', 503, 'DATABASE_UNAVAILABLE');
  }

  const user = await User.findOne(buildUserFilter(userId));
  if (!user) {
    throw new AppError(`User profile with ID "${userId}" not found`, 404, 'NOT_FOUND');
  }

  let mappingFilter;
  if (mongoose.Types.ObjectId.isValid(mappingId)) {
    mappingFilter = { $or: [{ _id: mappingId }, { legacyId: mappingId }] };
  } else {
    mappingFilter = { legacyId: mappingId };
  }

  const mapping = await SkillMapping.findOne(mappingFilter);
  if (!mapping) {
    throw new AppError(`Skill mapping with ID "${mappingId}" not found`, 404, 'NOT_FOUND');
  }

  if (mapping.userId.toString() !== user._id.toString()) {
    throw new AppError('Cannot delete skill mapping belonging to another user', 404, 'NOT_FOUND');
  }

  await SkillMapping.findByIdAndDelete(mapping._id);

  return {
    message: 'Skill mapping removed successfully',
    mappingId
  };
}

/**
 * Analyze an evidence item using AI to suggest matching skills from the catalog.
 * Does not automatically save the suggestions.
 * @param {string} userId
 * @param {string} evidenceId
 */
export async function analyzeEvidenceSkills(userId, evidenceId) {
  const reqStart = Date.now();
  console.log(`[SkillAnalysis] [Stage 1 - Start] Initiating analysis for userId: ${userId}, evidenceId: ${evidenceId}`);

  if (!isDbConnected()) {
    throw new AppError('Database connection unavailable. Please check MONGODB_URI.', 503, 'DATABASE_UNAVAILABLE');
  }

  const dbStart = Date.now();
  const user = await User.findOne(buildUserFilter(userId));
  if (!user) {
    throw new AppError(`User profile with ID "${userId}" not found`, 404, 'NOT_FOUND');
  }

  const ev = await Evidence.findOne(buildEvidenceFilter(evidenceId, user._id));
  if (!ev) {
    throw new AppError(`Evidence record with ID "${evidenceId}" not found for this user`, 404, 'NOT_FOUND');
  }

  const catalogSkills = await getSkills();
  const dbDuration = Date.now() - dbStart;
  console.log(`[SkillAnalysis] [Stage 2 - DB Query] Records retrieved in ${dbDuration}ms (Catalog size: ${catalogSkills.length})`);

  const prompt = buildSkillAnalysisPrompt({ evidence: ev.toJSON(), catalogSkills });
  console.log(`[SkillAnalysis] [Stage 3 - Prompt] Prepared prompt payload (${prompt.length} chars)`);

  const aiStart = Date.now();
  const rawAiResult = await generateStructuredJson({
    systemInstruction: SKILL_ANALYSIS_SYSTEM_INSTRUCTION,
    prompt,
    schema: SKILL_ANALYSIS_SCHEMA
  });
  const aiDuration = Date.now() - aiStart;
  console.log(`[SkillAnalysis] [Stage 4 - AI Provider] Gemini structured output received in ${aiDuration}ms`);

  const valStart = Date.now();
  const validated = validateAiSkillAnalysisOutput(rawAiResult, evidenceId, catalogSkills);

  // Enrich each suggested skill with its human-readable catalog name for UI convenience
  const skillMap = new Map(catalogSkills.map((s) => [s.id, s.name]));
  const enrichedSkills = validated.suggestedSkills.map((s) => ({
    ...s,
    skillName: skillMap.get(s.skillId) || s.skillId
  }));
  const valDuration = Date.now() - valStart;
  const totalDuration = Date.now() - reqStart;
  console.log(`[SkillAnalysis] [Stage 5 - Complete] Validated ${enrichedSkills.length} skills in ${valDuration}ms. Total pipeline: ${totalDuration}ms`);

  return { suggestedSkills: enrichedSkills };
}
