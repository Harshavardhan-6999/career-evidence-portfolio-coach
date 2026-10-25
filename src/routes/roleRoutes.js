/**
 * Module 1: Role Catalog Routes
 * Owner: N. Tharun Kumar (25071A66B8)
 */

import { Router } from 'express';
import { getAllRoles } from '../controllers/roleController.js';

const router = Router();

router.get('/', getAllRoles);

export default router;
