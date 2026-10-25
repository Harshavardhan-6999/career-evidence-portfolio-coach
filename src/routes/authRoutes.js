/**
 * Authentication Routes
 * Mounted at: /api/auth
 */

import { Router } from 'express';
import {
  registerHandler,
  loginHandler,
  logoutHandler,
  getMeHandler
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/register', authLimiter, registerHandler);
router.post('/login', authLimiter, loginHandler);
router.post('/logout', logoutHandler);
router.get('/me', authenticate, getMeHandler);

export default router;
