/**
 * Module 6: Skill & Skill Mapping Controller
 * Owner: J. Sankarshan (25071A6698)
 */

import {
  getSkills,
  getUserSkills,
  createSkillMapping,
  deleteSkillMapping,
  analyzeEvidenceSkills
} from '../services/skillService.js';
import { validateCreateSkillMapping } from '../validators/skillMappingValidators.js';

export async function getAllSkills(req, res, next) {
  try {
    const skills = await getSkills();
    return res.status(200).json({
      success: true,
      data: skills
    });
  } catch (err) {
    next(err);
  }
}

export async function getUserSkillsHandler(req, res, next) {
  try {
    const { userId } = req.params;
    const userSkills = await getUserSkills(userId);
    return res.status(200).json({
      success: true,
      data: userSkills
    });
  } catch (err) {
    next(err);
  }
}

export async function createSkillMappingHandler(req, res, next) {
  try {
    const { userId } = req.params;
    const catalog = await getSkills();
    const validated = validateCreateSkillMapping(req.body, catalog);

    const mapping = await createSkillMapping(userId, validated);
    return res.status(201).json({
      success: true,
      data: mapping
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteSkillMappingHandler(req, res, next) {
  try {
    const { userId, mappingId } = req.params;
    const result = await deleteSkillMapping(userId, mappingId);
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

export async function analyzeEvidenceSkillsHandler(req, res, next) {
  const handlerStart = Date.now();
  try {
    const { userId, evidenceId } = req.params;
    console.log(`[SkillController] Received skill analysis request for user: ${userId}, evidence: ${evidenceId}`);
    const suggestions = await analyzeEvidenceSkills(userId, evidenceId);
    console.log(`[SkillController] Successfully generated skill suggestions in ${Date.now() - handlerStart}ms`);
    return res.status(200).json({
      success: true,
      data: suggestions
    });
  } catch (err) {
    console.error(`[SkillController] Skill analysis failed after ${Date.now() - handlerStart}ms: ${err.message}`);
    next(err);
  }
}
