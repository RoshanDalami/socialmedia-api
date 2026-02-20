import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { listMentions } from '../controllers/mention.controller.js';

const router = Router();

router.use(verifyJWT);
router.get('/', listMentions);

export default router;
