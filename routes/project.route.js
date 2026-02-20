import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import {
    createProject,
    listProjects,
    getProject,
    updateProject,
    deleteProject,
    runProjectIngestion,
    fetchProjectMetrics,
    fetchProjectHealth,
} from '../controllers/project.controller.js';

const router = Router();

router.use(verifyJWT);
router.post('/', createProject);
router.get('/', listProjects);
router.get('/:id', getProject);
router.get('/:id/metrics', fetchProjectMetrics);
router.get('/:id/health', fetchProjectHealth);
router.patch('/:id', updateProject);
router.delete('/:id', deleteProject);
router.post('/:id/run', runProjectIngestion);

export default router;
