import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { listAlerts, markAlertRead } from '../controllers/alert.controller.js';

const router = Router();

router.use(verifyJWT);
router.get('/', listAlerts);
router.patch('/:id/read', markAlertRead);

export default router;
