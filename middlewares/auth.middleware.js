import jwt from 'jsonwebtoken';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/apiError.js';
import { User } from '../model/user.model.js';

export const verifyJWT = asyncHandler(async (req, _res, next) => {
    const token =
        req.cookies?.accessToken || req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        throw new ApiError(401, 'Access token missing');
    }

    try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const user = await User.findById(decoded?.userId).select('-password -refreshToken');

        if (!user) {
            throw new ApiError(404, 'User not found');
        }

        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401, 'Invalid access token');
    }
});
