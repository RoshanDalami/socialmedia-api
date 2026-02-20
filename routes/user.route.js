import { Router } from 'express';
import {
    registerUser,
    loginUser,
    logOutUser,
    changePassword,
    getCurrentUser,
    updateAccount,
    refreshAccessToken,
    forgotPassword,
    resetPassword,
} from '../controllers/user.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/refresh', refreshAccessToken);
router.post('/logout', verifyJWT, logOutUser);
router.get('/me', verifyJWT, getCurrentUser);
router.patch('/me', verifyJWT, updateAccount);
router.post('/change-password', verifyJWT, changePassword);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
