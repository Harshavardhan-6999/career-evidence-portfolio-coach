/**
 * Main Router Index
 * Mounts all sub-routers and health check.
 */

import { Router } from 'express';
import authRoutes from './authRoutes.js';
import roleRoutes from './roleRoutes.js';
import skillRoutes from './skillRoutes.js';
import userRoutes from './userRoutes.js';
import jobDescriptionRoutes from './jobDescriptionRoutes.js';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'career-evidence-portfolio-coach'
  });
});

// Mount API sub-routers
router.use('/api/auth', authRoutes);
router.use('/api/roles', roleRoutes);
router.use('/api/skills', skillRoutes);
router.use('/api/users', userRoutes);
router.use('/api/job-descriptions', jobDescriptionRoutes);

export default router;
