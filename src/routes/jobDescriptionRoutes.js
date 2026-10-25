/**
 * Job Description Analysis Routes
 * Mounted at: /api/job-descriptions and /api/users/:userId/job-descriptions
 */

import { Router } from 'express';
import {
  analyzeJobDescriptionHandler,
  getJobDescriptionAnalysesHandler,
  getJobDescriptionAnalysisByIdHandler
} from '../controllers/jobDescriptionController.js';
import { authenticate, requireOwnership } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiter.js';

const router = Router({ mergeParams: true });

// Require authentication for all job description analysis endpoints
router.use(authenticate);

// If userId is in params, require ownership
router.use((req, res, next) => {
  if (req.params.userId) {
    return requireOwnership('userId')(req, res, next);
  }
  next();
});

router.post('/analyze', aiLimiter, analyzeJobDescriptionHandler);
router.get('/', getJobDescriptionAnalysesHandler);
router.get('/:id', getJobDescriptionAnalysisByIdHandler);

export default router;
