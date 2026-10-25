/**
 * Rate Limiting Middleware
 * Protects authentication endpoints from brute-force attempts and
 * prevents runaway quotas on generative AI operations.
 */

import rateLimit from 'express-rate-limit';

const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000; // 15 minutes

/**
 * General API rate limiter for standard endpoints.
 */
export const generalLimiter = rateLimit({
  windowMs,
  max: Number(process.env.RATE_LIMIT_MAX) || 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests from this IP address. Please slow down and try again later.'
      }
    });
  }
});

/**
 * Strict rate limiter for Authentication endpoints (Login & Registration).
 */
export const authLimiter = rateLimit({
  windowMs,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 15,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        message: 'Too many authentication attempts from this IP. Please wait 15 minutes before trying again.'
      }
    });
  }
});

/**
 * Quota-protection rate limiter for Generative AI endpoints.
 */
export const aiLimiter = rateLimit({
  windowMs,
  max: Number(process.env.AI_RATE_LIMIT_MAX) || 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'AI_RATE_LIMIT_EXCEEDED',
        message: 'AI request limit reached for this session window. Please wait a few minutes before submitting new AI requests.'
      }
    });
  }
});
