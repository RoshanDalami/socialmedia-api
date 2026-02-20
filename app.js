import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import cookieParser from './middlewares/cookie.middleware.js';
import rateLimiter from './middlewares/rateLimit.middleware.js';
import figureRoutes from './routes/figure.route.js';
import userRoutes from './routes/user.route.js';
import projectRoutes from './routes/project.route.js';
import mentionRoutes from './routes/mention.route.js';
import alertRoutes from './routes/alert.route.js';
import reportRoutes from './routes/report.route.js';
import adminRoutes from './routes/admin.route.js';
import pageRoutes from './routes/page.route.js';
import settingsRoutes from './routes/settings.route.js';

const app = express();

const ALLOWED_ORIGIN = process.env.FRONTEND_URL || 'http://localhost:5173';
const BODY_SIZE_LIMIT = '50mb';
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 120;

const corsOptions = {
    origin: ALLOWED_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
const jsonParser = express.json({ limit: BODY_SIZE_LIMIT });
app.use(jsonParser);

app.use(express.urlencoded({ extended: true, limit: BODY_SIZE_LIMIT }));
app.use(cookieParser);
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(rateLimiter({ windowMs: RATE_LIMIT_WINDOW_MS, max: RATE_LIMIT_MAX_REQUESTS }));

app.get('/', (_req, res) => {
    res.json({
        service: 'NPIP backend',
        status: 'ok',
        docs: 'Use /health or /api/v1/* endpoints',
    });
});

app.get('/api/v1', (_req, res) => {
    res.json({
        status: 'ok',
        message: 'NPIP API v1',
    });
});

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: Date.now() }));

app.use('/uploads', express.static('uploads'));
app.use('/api/v1/figures', figureRoutes);
app.use('/api/v1/auth', userRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/mentions', mentionRoutes);
app.use('/api/v1/alerts', alertRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/pages', pageRoutes);
app.use('/api/v1/settings', settingsRoutes);

app.use((err, _req, res, _next) => {
    res.header('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.header('Access-Control-Allow-Credentials', 'true');

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    if (process.env.NODE_ENV !== 'production') {
        console.error('[Error]', err.stack || err);
    }

    res.status(statusCode).json({ statusCode, message, success: false });
});

export default app;
