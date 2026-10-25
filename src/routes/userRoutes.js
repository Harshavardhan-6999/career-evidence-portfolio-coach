/**
 * Module 4, 5, 6, 7, 8: User, Evidence, Skill Mapping, Portfolio, Coaching & Roadmap Routes
 * Mounted at: /api/users
 */

import { Router } from 'express';
import { isValidId, AppError } from '../validators/commonValidators.js';
import { authenticate, requireOwnership } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiter.js';

// User Controllers (Module 4 - M. Rohit Sai)
import {
  createUserHandler,
  getUserByIdHandler,
  updateUserHandler
} from '../controllers/userController.js';

// Evidence Controllers (Module 5 - T. Jaswanth)
import {
  createEvidenceHandler,
  listEvidenceHandler,
  getEvidenceByIdHandler,
  updateEvidenceHandler,
  deleteEvidenceHandler
} from '../controllers/evidenceController.js';

// Skills and Mappings Controllers (Module 6 - J. Sankarshan)
import {
  getUserSkillsHandler,
  createSkillMappingHandler,
  deleteSkillMappingHandler,
  analyzeEvidenceSkillsHandler
} from '../controllers/skillController.js';

// Role Gap Controller (Module 1 - N. Tharun Kumar)
import { getRoleGapHandler } from '../controllers/roleGapController.js';

// Portfolio Controllers (Module 7 - T. Nikhil)
import {
  upsertPortfolioHandler,
  getPortfolioHandler
} from '../controllers/portfolioController.js';

// Coaching & Roadmap Controllers (Module 8 - R. Suryaprakash)
import {
  generateCoachingHandler,
  getLatestCoachingHandler,
  updateRoadmapTaskHandler
} from '../controllers/coachingController.js';

// Job Description Routes
import jobDescriptionRoutes from './jobDescriptionRoutes.js';

const router = Router();

/**
 * Middleware to validate UUID / ObjectId format in URL parameters.
 */
function validateParamId(paramName) {
  return (req, res, next) => {
    const val = req.params[paramName];
    if (val && !isValidId(val)) {
      return next(new AppError(`Invalid ID format for ${paramName}: "${val}"`, 400, 'VALIDATION_ERROR'));
    }
    next();
  };
}

// -------------------------------------------------------------
// Core User Profile Creation (Module 4)
// (For account registration with email/password, use POST /api/auth/register)
// -------------------------------------------------------------
router.post('/', createUserHandler);

// -------------------------------------------------------------
// Protected User Endpoints (Require Authentication & Identity Ownership)
// -------------------------------------------------------------
router.use('/:userId', authenticate, requireOwnership('userId'));

// User Profile Endpoints
router.get('/:userId', validateParamId('userId'), getUserByIdHandler);
router.patch('/:userId', validateParamId('userId'), updateUserHandler);

// Evidence Endpoints (Module 5 - T. Jaswanth)
router.post('/:userId/evidence', validateParamId('userId'), createEvidenceHandler);
router.get('/:userId/evidence', validateParamId('userId'), listEvidenceHandler);
router.get(
  '/:userId/evidence/:evidenceId',
  validateParamId('userId'),
  validateParamId('evidenceId'),
  getEvidenceByIdHandler
);
router.patch(
  '/:userId/evidence/:evidenceId',
  validateParamId('userId'),
  validateParamId('evidenceId'),
  updateEvidenceHandler
);
router.delete(
  '/:userId/evidence/:evidenceId',
  validateParamId('userId'),
  validateParamId('evidenceId'),
  deleteEvidenceHandler
);

// Skills & Skill Mappings Endpoints (Module 6 - J. Sankarshan)
router.get('/:userId/skills', validateParamId('userId'), getUserSkillsHandler);
router.post('/:userId/skill-mappings', validateParamId('userId'), createSkillMappingHandler);
router.delete(
  '/:userId/skill-mappings/:mappingId',
  validateParamId('userId'),
  validateParamId('mappingId'),
  deleteSkillMappingHandler
);

// AI Skill Extraction from Evidence (Module 6 & Module 2)
router.post(
  '/:userId/evidence/:evidenceId/analyze',
  aiLimiter,
  validateParamId('userId'),
  validateParamId('evidenceId'),
  analyzeEvidenceSkillsHandler
);

// Role Gap Analysis Endpoint (Module 1 - N. Tharun Kumar)
router.get('/:userId/role-gap', validateParamId('userId'), getRoleGapHandler);

// Portfolio Endpoints (Module 7 - T. Nikhil)
router.put('/:userId/portfolio', validateParamId('userId'), upsertPortfolioHandler);
router.get('/:userId/portfolio', validateParamId('userId'), getPortfolioHandler);

// Coaching & Interactive Roadmap Endpoints (Module 8 - R. Suryaprakash)
router.post('/:userId/coaching', aiLimiter, validateParamId('userId'), generateCoachingHandler);
router.get('/:userId/coaching/latest', validateParamId('userId'), getLatestCoachingHandler);
router.patch(
  '/:userId/coaching/:coachingId/tasks/:taskId',
  validateParamId('userId'),
  validateParamId('coachingId'),
  updateRoadmapTaskHandler
);

// Job Description Analysis under user
router.use('/:userId/job-descriptions', jobDescriptionRoutes);

export default router;
