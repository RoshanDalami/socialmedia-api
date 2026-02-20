import { Router } from 'express';
import { getPublicSettings } from '../controllers/siteSetting.controller.js';

const router = Router();

router.get('/', getPublicSettings);

export default router;
