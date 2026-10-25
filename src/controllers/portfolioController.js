/**
 * Module 7: Portfolio Controller
 * Owner: T. Nikhil (25071A66D6)
 */

import { upsertPortfolio, getAssembledPortfolio } from '../services/portfolioService.js';
import { validateUpsertPortfolio } from '../validators/portfolioValidators.js';

export async function upsertPortfolioHandler(req, res, next) {
  try {
    const { userId } = req.params;
    const validated = validateUpsertPortfolio(req.body);
    const portfolio = await upsertPortfolio(userId, validated);
    return res.status(200).json({
      success: true,
      data: portfolio
    });
  } catch (err) {
    next(err);
  }
}

export async function getPortfolioHandler(req, res, next) {
  try {
    const { userId } = req.params;
    const assembled = await getAssembledPortfolio(userId);
    return res.status(200).json({
      success: true,
      data: assembled
    });
  } catch (err) {
    next(err);
  }
}
