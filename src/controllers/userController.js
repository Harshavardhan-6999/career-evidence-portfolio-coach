/**
 * Module 4: User Profile Controller
 * Owner: M. Rohit Sai (25071A66B2)
 */

import { createUser, getUserById, updateUser } from '../services/userService.js';
import { getRoles } from '../services/roleService.js';
import { validateCreateUser, validateUpdateUser } from '../validators/userValidators.js';

export async function createUserHandler(req, res, next) {
  try {
    const roles = await getRoles();
    const validated = validateCreateUser(req.body, roles);
    const user = await createUser(validated);
    return res.status(201).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
}

export async function getUserByIdHandler(req, res, next) {
  try {
    const { userId } = req.params;
    const user = await getUserById(userId);
    return res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
}

export async function updateUserHandler(req, res, next) {
  try {
    const { userId } = req.params;
    const roles = await getRoles();
    const validated = validateUpdateUser(req.body, roles);
    const updated = await updateUser(userId, validated);
    return res.status(200).json({
      success: true,
      data: updated
    });
  } catch (err) {
    next(err);
  }
}
