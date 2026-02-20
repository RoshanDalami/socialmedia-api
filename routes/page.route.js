import { Router } from 'express';
import { getPublishedPage, listPublishedPages } from '../controllers/publicPage.controller.js';

const router = Router();

router.get('/', listPublishedPages);
router.get('/:slug', getPublishedPage);

export default router;
