/**
 * Module 6: Skill Catalog Routes
 * Owner: J. Sankarshan (25071A6698)
 */

import { Router } from 'express';
import { getAllSkills } from '../controllers/skillController.js';

const router = Router();

router.get('/', getAllSkills);

export default router;
