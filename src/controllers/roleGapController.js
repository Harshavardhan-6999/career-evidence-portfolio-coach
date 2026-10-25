/**
 * Module 1: Role Gap Controller
 * Owner: N. Tharun Kumar (25071A66B8)
 */

import { computeRoleGap } from '../services/roleGapService.js';

export async function getRoleGapHandler(req, res, next) {
  try {
    const { userId } = req.params;
    const { roleId } = req.query;
    const result = await computeRoleGap(userId, roleId);
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
}
