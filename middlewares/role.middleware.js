import ApiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';

export const requireAdmin = asyncHandler(async (req, _res, next) => {
    const role = req.user?.role;
    if (role !== 'admin') {
        throw new ApiError(403, 'Admin access required');
    }
    next();
});
