import { Router } from 'express';
import {
    searchFigure,
    getFigureIdentity,
    getFigureNews,
    getFigureVideos,
} from '../controllers/figure.controller.js';

const router = Router();

router.get('/search', searchFigure);
router.get('/identity', getFigureIdentity);
router.get('/news', getFigureNews);
router.get('/videos', getFigureVideos);

export default router;
