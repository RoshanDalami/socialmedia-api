import dotenv from 'dotenv';
import fs from 'fs';
import http from 'http';
import { Server } from 'socket.io';

import app from './app.js';
import connectToDB from './db/connectToDatabase.helper.js';
import { initSocket } from './services/socket.service.js';
import { startIngestionScheduler } from './services/ingestion.service.js';

const envPath = './ai.env';
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    dotenv.config();
}

const PORT = Number(process.env.PORT) || 8000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: FRONTEND_URL, credentials: true },
});

io.on('connection', (socket) => {
    socket.on('join', ({ userId, projectId }) => {
        if (userId) socket.join(`user:${userId}`);
        if (projectId) socket.join(`project:${projectId}`);
    });
});

initSocket(io);

const gracefulShutdown = (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
    });
    setTimeout(() => {
        console.error('Forced shutdown after timeout.');
        process.exit(1);
    }, 10_000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

connectToDB()
    .then(() => {
        server.listen(PORT, () => {
            console.log(`NPIP backend running on port ${PORT}`);
        });
        startIngestionScheduler();
    })
    .catch((err) => {
        console.error('Failed to start server:', err);
        process.exit(1);
    });
