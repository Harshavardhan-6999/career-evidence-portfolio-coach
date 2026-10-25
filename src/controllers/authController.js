/**
 * Authentication Controller
 * Handles registration, login, logout, and session check endpoints.
 */

import { register, login, getCurrentUser } from '../services/authService.js';
import { getRoles } from '../services/roleService.js';
import { validateRegister, validateLogin } from '../validators/authValidators.js';
import { generateToken, setAuthCookie, clearAuthCookie } from '../middleware/auth.js';

export async function registerHandler(req, res, next) {
  try {
    const roles = await getRoles();
    const validated = validateRegister(req.body, roles);
    const user = await register(validated);

    const token = generateToken(user);
    setAuthCookie(res, token);

    return res.status(201).json({
      success: true,
      data: {
        user: user.toJSON(),
        token
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function loginHandler(req, res, next) {
  try {
    const validated = validateLogin(req.body);
    const user = await login(validated.email, validated.password);

    const token = generateToken(user);
    setAuthCookie(res, token);

    return res.status(200).json({
      success: true,
      data: {
        user: user.toJSON(),
        token
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function logoutHandler(req, res, next) {
  try {
    clearAuthCookie(res);
    return res.status(200).json({
      success: true,
      data: {
        message: 'Logged out successfully'
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function getMeHandler(req, res, next) {
  try {
    const userProfile = await getCurrentUser(req.user.id || req.user._id?.toString());
    return res.status(200).json({
      success: true,
      data: {
        user: userProfile
      }
    });
  } catch (err) {
    next(err);
  }
}
