/**
 * Module 8: Coaching Controller
 * Owner: R. Suryaprakash (25071A66C5)
 */

import {
  generateCoaching,
  getLatestCoaching,
  updateRoadmapTaskStatus
} from '../services/coachingService.js';
import { AppError } from '../validators/commonValidators.js';

export async function generateCoachingHandler(req, res, next) {
  try {
    const { userId } = req.params;
    const coaching = await generateCoaching(userId);
    return res.status(201).json({
      success: true,
      data: coaching
    });
  } catch (err) {
    next(err);
  }
}

export async function getLatestCoachingHandler(req, res, next) {
  try {
    const { userId } = req.params;
    const latest = await getLatestCoaching(userId);
    return res.status(200).json({
      success: true,
      data: latest
    });
  } catch (err) {
    next(err);
  }
}

export async function updateRoadmapTaskHandler(req, res, next) {
  try {
    const { userId, coachingId, taskId } = req.params;
    const { status } = req.body;

    if (!status) {
      throw new AppError('Task status is required (todo, in_progress, completed)', 400, 'VALIDATION_ERROR');
    }

    const updated = await updateRoadmapTaskStatus(userId, coachingId, taskId, status);
    return res.status(200).json({
      success: true,
      data: updated
    });
  } catch (err) {
    next(err);
  }
}
