import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { verifyJWT } from '../middlewares/auth.middleware.js';
import { requireAdmin } from '../middlewares/role.middleware.js';
import ApiError from '../utils/apiError.js';
import {
    listAdminPages,
    getAdminPage,
    updateAdminPage,
    listAdminMedia,
    uploadAdminMedia,
    deleteAdminMedia,
} from '../controllers/adminCms.controller.js';
import { getAdminSettings, updateAdminSettings } from '../controllers/siteSetting.controller.js';

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '..', 'uploads');
const MAX_MEDIA_FILE_SIZE_MB = 5;
const MAX_MEDIA_FILE_SIZE_BYTES = MAX_MEDIA_FILE_SIZE_MB * 1024 * 1024;
const MIME_TO_EXTENSION = Object.freeze({
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/avif': '.avif',
});
const ALLOWED_IMAGE_MIME_TYPES = new Set(Object.keys(MIME_TO_EXTENSION));
const ALLOWED_IMAGE_EXTENSIONS = new Set(Object.values(MIME_TO_EXTENSION));

const resolveImageExtension = (file) => {
    const mimeExtension = MIME_TO_EXTENSION[file.mimetype];
    if (mimeExtension) return mimeExtension;

    const originalExtension = path.extname(file.originalname || '').toLowerCase();
    if (ALLOWED_IMAGE_EXTENSIONS.has(originalExtension)) return originalExtension;

    return '.png';
};

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (_req, file, cb) => {
        const timestamp = Date.now();
        const random = Math.round(Math.random() * 1e9);
        const ext = resolveImageExtension(file);
        cb(null, `admin-${timestamp}-${random}${ext}`);
    },
});

const fileFilter = (_req, file, cb) => {
    const mimetype = String(file.mimetype || '').toLowerCase();
    const extension = path.extname(file.originalname || '').toLowerCase();
    const mimeAllowed = ALLOWED_IMAGE_MIME_TYPES.has(mimetype);
    const extensionAllowed = ALLOWED_IMAGE_EXTENSIONS.has(extension);

    if (!mimeAllowed || !extensionAllowed) {
        cb(new ApiError(400, 'Only PNG, JPG, WEBP, GIF, or AVIF images are allowed'));
        return;
    }

    cb(null, true);
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_MEDIA_FILE_SIZE_BYTES,
    },
});

const uploadMediaMiddleware = (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (!err) {
            next();
            return;
        }

        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                next(new ApiError(413, `File too large. Max size is ${MAX_MEDIA_FILE_SIZE_MB}MB`));
                return;
            }
            next(new ApiError(400, err.message));
            return;
        }

        next(err instanceof Error ? err : new ApiError(400, 'Invalid media upload'));
    });
};

router.use(verifyJWT, requireAdmin);

router.get('/pages', listAdminPages);
router.get('/pages/:id', getAdminPage);
router.put('/pages/:id', updateAdminPage);

router.get('/media', listAdminMedia);
router.post('/media', uploadMediaMiddleware, uploadAdminMedia);
router.delete('/media/:id', deleteAdminMedia);

router.get('/settings', getAdminSettings);
router.put('/settings', updateAdminSettings);

export default router;
