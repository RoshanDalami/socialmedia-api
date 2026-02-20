import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { downloadReport, downloadCSV, downloadExcel } from '../controllers/report.controller.js';

const router = Router();

router.use(verifyJWT);
router.get('/:id/pdf', downloadReport);
router.get('/:id/csv', downloadCSV);
router.get('/:id/excel', downloadExcel);

export default router;
