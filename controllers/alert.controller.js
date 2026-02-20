import { Alert } from '../model/alert.model.js';
import ApiResponse from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

export const listAlerts = asyncHandler(async (req, res) => {
    const alerts = await Alert.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .limit(100);
    return res.status(200).json(new ApiResponse(200, alerts, 'Alerts fetched'));
});

export const markAlertRead = asyncHandler(async (req, res) => {
    const alert = await Alert.findOneAndUpdate(
        { _id: req.params.id, userId: req.user._id },
        { readAt: new Date() },
        { new: true }
    );
    return res.status(200).json(new ApiResponse(200, alert, 'Alert updated'));
});
