/**
 * Module 3 & AI: Job Description Analysis Controller
 *
 * Handles job description extraction, 3-tier skill gap computation,
 * and retrieval of historical JD analyses.
 */

import {
  analyzeJobDescription,
  getJobDescriptionAnalyses,
  getJobDescriptionAnalysisById
} from '../services/jobDescriptionService.js';
import { AppError, isNonEmptyString } from '../validators/commonValidators.js';

export async function analyzeJobDescriptionHandler(req, res, next) {
  try {
    // Identify user from authentication or route parameters
    const userId = req.user?.id || req.params.userId || req.body.userId;
    if (!userId) {
      throw new AppError('User identification is required to analyze a job description.', 401, 'UNAUTHORIZED');
    }

    const rawText = req.body.rawText || req.body.text || req.body.jobDescription;
    if (!isNonEmptyString(rawText, 10, 20000)) {
      throw new AppError(
        'Job description text must be provided and between 10 and 20,000 characters long.',
        400,
        'VALIDATION_ERROR'
      );
    }

    const result = await analyzeJobDescription(userId, rawText);
    return res.status(201).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

export async function getJobDescriptionAnalysesHandler(req, res, next) {
  try {
    const userId = req.user?.id || req.params.userId;
    if (!userId) {
      throw new AppError('User identification is required.', 401, 'UNAUTHORIZED');
    }

    const analyses = await getJobDescriptionAnalyses(userId);
    return res.status(200).json({
      success: true,
      data: analyses
    });
  } catch (err) {
    next(err);
  }
}

export async function getJobDescriptionAnalysisByIdHandler(req, res, next) {
  try {
    const userId = req.user?.id || req.params.userId;
    const { id } = req.params;

    if (!userId) {
      throw new AppError('User identification is required.', 401, 'UNAUTHORIZED');
    }

    const analysis = await getJobDescriptionAnalysisById(userId, id);
    return res.status(200).json({
      success: true,
      data: analysis
    });
  } catch (err) {
    next(err);
  }
}
