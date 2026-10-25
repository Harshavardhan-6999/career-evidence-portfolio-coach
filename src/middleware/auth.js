/**
 * Authentication and Ownership Authorization Middleware
 * Verifies JWT tokens from HttpOnly cookies or Bearer Authorization headers,
 * loads the authenticated user, and enforces strict identity ownership.
 */

import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { AppError } from '../validators/commonValidators.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_insecure_jwt_secret_min_32_chars_long!!';

/**
 * Extract token from either HttpOnly cookie or Authorization Bearer header.
 * @param {import('express').Request} req
 * @returns {string | null}
 */
export function extractToken(req) {
  // 1. Check HttpOnly cookie first (recommended for browser sessions)
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }

  // 2. Check Authorization Bearer header (for Postman and API clients)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1].trim();
  }

  return null;
}

/**
 * Authenticate incoming request. Populates `req.user` if valid.
 */
export async function authenticate(req, res, next) {
  try {
    const token = extractToken(req);

    if (!token) {
      return next(
        new AppError('Authentication required. Please log in or provide a valid Bearer token.', 401, 'UNAUTHORIZED')
      );
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        return next(new AppError('Your session has expired. Please log in again.', 401, 'SESSION_EXPIRED'));
      }
      return next(new AppError('Invalid authentication token.', 401, 'INVALID_TOKEN'));
    }

    let user = null;
    if (decoded.id && /^[0-9a-fA-F]{24}$/.test(decoded.id)) {
      user = await User.findById(decoded.id);
    } else if (decoded.id) {
      user = await User.findOne({ $or: [{ _id: decoded.id }, { legacyId: decoded.id }] });
    }

    if (!user) {
      return next(new AppError('The account associated with this session no longer exists.', 401, 'ACCOUNT_NOT_FOUND'));
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Enforces ownership: verifies that the authenticated user matches the specified path parameter (defaulting to `:userId`).
 * Strictly prevents student A from reading or modifying student B's records.
 * Can be used directly as `requireOwnership` or with parameter name: `requireOwnership('userId')`.
 */
export function requireOwnership(reqOrParam = 'userId', res, next) {
  if (typeof reqOrParam === 'string') {
    const paramName = reqOrParam;
    return (req, res, next) => enforceOwnershipCheck(req, res, next, paramName);
  }
  return enforceOwnershipCheck(reqOrParam, res, next, 'userId');
}

function enforceOwnershipCheck(req, res, next, paramName) {
  if (!req.user) {
    return next(new AppError('Authentication required.', 401, 'UNAUTHORIZED'));
  }

  const paramUserId = req.params[paramName];
  if (!paramUserId) {
    return next();
  }

  const userIdStr = req.user.id || req.user._id?.toString();
  const legacyIdStr = req.user.legacyId;
  const isOwner = paramUserId === userIdStr || (legacyIdStr && paramUserId === legacyIdStr);

  if (!isOwner && req.user.role !== 'admin') {
    return next(
      new AppError('Access denied. You do not have permission to view or modify another student\'s records.', 403, 'FORBIDDEN')
    );
  }

  next();
}

/**
 * Helper to generate signed JWT for a user.
 * @param {object} user
 * @returns {string}
 */
export function generateToken(user) {
  return jwt.sign(
    {
      id: user.id || user._id.toString(),
      email: user.email,
      role: user.role || 'student'
    },
    JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    }
  );
}

/**
 * Helper to set secure HttpOnly cookie on response.
 * @param {import('express').Response} res
 * @param {string} token
 */
export function setAuthCookie(res, token) {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
}

/**
 * Helper to clear authentication cookie on logout.
 * @param {import('express').Response} res
 */
export function clearAuthCookie(res) {
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie('token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax'
  });
}
