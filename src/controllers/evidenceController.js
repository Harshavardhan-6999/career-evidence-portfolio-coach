/**
 * Module 5: Evidence Controller
 * Owner: T. Jaswanth (25071A66D5)
 */

import {
  createEvidence,
  listEvidence,
  getEvidenceById,
  updateEvidence,
  deleteEvidence
} from '../services/evidenceService.js';
import {
  validateCreateEvidence,
  validateUpdateEvidence
} from '../validators/evidenceValidators.js';

export async function createEvidenceHandler(req, res, next) {
  try {
    const { userId } = req.params;
    const validated = validateCreateEvidence(req.body);
    const newEvidence = await createEvidence(userId, validated);
    return res.status(201).json({
      success: true,
      data: newEvidence
    });
  } catch (err) {
    next(err);
  }
}

export async function listEvidenceHandler(req, res, next) {
  try {
    const { userId } = req.params;
    const { type } = req.query;
    const items = await listEvidence(userId, { type });
    return res.status(200).json({
      success: true,
      data: items
    });
  } catch (err) {
    next(err);
  }
}

export async function getEvidenceByIdHandler(req, res, next) {
  try {
    const { userId, evidenceId } = req.params;
    const item = await getEvidenceById(userId, evidenceId);
    return res.status(200).json({
      success: true,
      data: item
    });
  } catch (err) {
    next(err);
  }
}

export async function updateEvidenceHandler(req, res, next) {
  try {
    const { userId, evidenceId } = req.params;
    const validated = validateUpdateEvidence(req.body);
    const updated = await updateEvidence(userId, evidenceId, validated);
    return res.status(200).json({
      success: true,
      data: updated
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteEvidenceHandler(req, res, next) {
  try {
    const { userId, evidenceId } = req.params;
    const result = await deleteEvidence(userId, evidenceId);
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
}
