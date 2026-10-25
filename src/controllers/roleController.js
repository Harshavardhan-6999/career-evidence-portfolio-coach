/**
 * Module 1: Role Controller
 * Owner: N. Tharun Kumar (25071A66B8)
 */

import { getRoles } from '../services/roleService.js';

export async function getAllRoles(req, res, next) {
  try {
    const roles = await getRoles();
    return res.status(200).json({
      success: true,
      data: roles
    });
  } catch (err) {
    next(err);
  }
}
