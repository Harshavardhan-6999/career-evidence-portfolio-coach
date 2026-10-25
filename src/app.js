/**
 * Module 2: Express Application Configuration
 * Owner: P. Srihith Reddy (25071A66B9)
 *
 * Configures Express app, middlewares, security boundaries, rate limiting,
 * static frontend asset delivery, and centralized error handling.
 */

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import routes from './routes/index.js';
import { requestLogger } from './middleware/requestLogger.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { errorHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const frontendDistPath = path.resolve(__dirname, '../frontend/dist');

export function createApp() {
  const app = express();

  // Cross-Origin Resource Sharing with credentials enabled for HttpOnly cookies
  app.use(
    cors({
      origin: true,
      credentials: true
    })
  );

  // Cookie parser for HttpOnly session tokens
  app.use(cookieParser(process.env.COOKIE_SECRET || 'dev_cookie_secret_fallback_32_chars_min!'));

  // Global rate limiter
  app.use(generalLimiter);

  // Strictly bound JSON body size to prevent memory exhaustion
  app.use(express.json({ limit: '100kb' }));

  // Non-intrusive development request logging
  app.use(requestLogger);

  // Mount API endpoints
  app.use(routes);

  // Serve compiled React frontend if built
  if (fs.existsSync(frontendDistPath)) {
    app.use(express.static(frontendDistPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path === '/health') {
        return next();
      }
      res.sendFile(path.join(frontendDistPath, 'index.html'));
    });
  }

  // Handle unregistered API routes
  app.use(notFoundHandler);

  // Centralized standard error handler
  app.use(errorHandler);

  return app;
}

const app = createApp();
export default app;
