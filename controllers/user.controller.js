import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../model/user.model.js';
import ApiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/apiResponse.js';
import { sendEmail, sendPasswordResetEmail, sendWelcomeEmail } from '../services/email.service.js';

const generateRefreshAndAccessToken = async (userid) => {
    try {
        const user = await User.findById(userid);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });
        return { accessToken, refreshToken };
    } catch (err) {
        throw new ApiError(500, 'Unable to generate tokens');
    }
};

const registerUser = asyncHandler(async (req, res) => {
    const { fullName, username, email, password } = req.body;

    if ([fullName, username, email, password].some((field) => !field?.trim())) {
        throw new ApiError(400, 'All fields are required');
    }

    const existed = await User.findOne({ $or: [{ username }, { email }] });
    if (existed) {
        throw new ApiError(409, 'User already exists');
    }

    const user = await User.create({
        fullName,
        email,
        username: username.toLowerCase(),
        password,
    });

    const createdUser = await User.findById(user._id).select('-password -refreshToken');
    if (!createdUser) {
        throw new ApiError(500, 'Unable to create user');
    }

    // Send welcome email (don't block registration if it fails)
    sendWelcomeEmail(user.email, user.fullName).catch(err => {
        console.warn('[Registration] Failed to send welcome email:', err.message);
    });

    return res.status(201).json(new ApiResponse(201, createdUser, 'User created successfully'));
});

const loginUser = asyncHandler(async (req, res) => {
    const { username, email, password, identifier } = req.body;
    const trimmedUsername = username?.trim();
    const trimmedEmail = email?.trim();
    const trimmedIdentifier = identifier?.trim();
    const hasLegacyCredentials = Boolean(trimmedUsername) || Boolean(trimmedEmail);
    const hasIdentifier = Boolean(trimmedIdentifier);

    if (!hasIdentifier && !hasLegacyCredentials) {
        throw new ApiError(400, 'Username or email is required');
    }
    if (trimmedUsername && trimmedEmail) {
        throw new ApiError(400, 'Provide either a username or email, not both');
    }
    if (hasIdentifier && hasLegacyCredentials) {
        throw new ApiError(400, 'Provide either identifier or username/email, not both');
    }
    if (!password) {
        throw new ApiError(400, 'Password is required');
    }

    let user = null;
    if (hasIdentifier) {
        const normalizedIdentifier = trimmedIdentifier.toLowerCase();
        user = await User.findOne({
            $or: [{ email: normalizedIdentifier }, { username: normalizedIdentifier }],
        });
    } else {
        user = await User.findOne({
            $or: [
                trimmedEmail && { email: trimmedEmail.toLowerCase() },
                trimmedUsername && { username: trimmedUsername.toLowerCase() },
            ].filter(Boolean),
        });
    }

    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    const isPasswordMatched = await user.isPasswordCorrect(password);
    if (!isPasswordMatched) {
        throw new ApiError(401, 'Invalid credentials');
    }

    const { refreshToken, accessToken } = await generateRefreshAndAccessToken(user._id);
    const userData = await User.findById(user._id).select('-password -refreshToken');

    const isHttps = process.env.FRONTEND_URL?.startsWith('https://');
    const cookieOptions = {
        httpOnly: true,
        secure: !!isHttps,
        sameSite: isHttps ? 'none' : 'lax',
        path: '/',
    };

    return res
        .status(200)
        .cookie('refreshToken', refreshToken, cookieOptions)
        .cookie('accessToken', accessToken, cookieOptions)
        .json(new ApiResponse(200, { user: userData, accessToken }, 'Login successful'));
});

const logOutUser = asyncHandler(async (req, res) => {
    if (!req.user) {
        throw new ApiError(401, 'User not logged in');
    }

    await User.findByIdAndUpdate(req.user._id, { $set: { refreshToken: null } }, { new: true });

    const isHttps = process.env.FRONTEND_URL?.startsWith('https://');
    const cookieOptions = {
        httpOnly: true,
        secure: !!isHttps,
        sameSite: isHttps ? 'none' : 'lax',
        path: '/',
    };

    return res
        .status(200)
        .clearCookie('accessToken', cookieOptions)
        .clearCookie('refreshToken', cookieOptions)
        .json(new ApiResponse(200, null, 'User logged out successfully'));
});

const changePassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (!oldPassword || !newPassword) {
        throw new ApiError(400, 'Old password and new password are required');
    }
    if (newPassword !== confirmPassword) {
        throw new ApiError(400, 'New password and confirm password do not match');
    }

    const user = await User.findById(req.user._id);
    const isPasswordMatched = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordMatched) {
        throw new ApiError(401, 'Old password is incorrect');
    }

    user.password = newPassword;
    user.refreshToken = null;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json(new ApiResponse(200, null, 'Password changed successfully'));
});

const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(new ApiResponse(200, req.user, 'Current user fetched successfully'));
});

const updateAccount = asyncHandler(async (req, res) => {
    let { fullName, username, email } = req.body;

    fullName = fullName?.trim();
    username = username?.trim();
    email = email?.trim()?.toLowerCase();

    if (!fullName && !username && !email) {
        throw new ApiError(400, 'At least one field is required to update');
    }

    const userId = req.user._id;

    if (username || email) {
        const existed = await User.findOne({
            _id: { $ne: userId },
            $or: [username && { username }, email && { email }].filter(Boolean),
        });

        if (existed) {
            throw new ApiError(409, 'Username or email already in use');
        }
    }

    const updateFields = {};
    if (fullName) updateFields.fullName = fullName;
    if (username) updateFields.username = username;
    if (email) updateFields.email = email;

    const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: updateFields },
        { new: true, runValidators: true }
    ).select('-password -refreshToken');

    return res.status(200).json(new ApiResponse(200, updatedUser, 'Account updated successfully'));
});

const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email?.trim()) {
        throw new ApiError(400, 'Email is required');
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    // Always return success to prevent email enumeration attacks
    if (!user) {
        return res.status(200).json(new ApiResponse(200, null, 'If an account exists, a password reset email has been sent'));
    }

    const resetToken = user.generatePasswordResetToken();
    await user.save({ validateBeforeSave: false });

    const emailSent = await sendPasswordResetEmail(user.email, resetToken, user.fullName);

    if (!emailSent) {
        // If email service is not configured, return the token for development purposes
        if (process.env.NODE_ENV === 'development') {
            return res.status(200).json(new ApiResponse(200, { resetToken }, 'Email service not configured. Use the token directly in development.'));
        }
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });
        throw new ApiError(500, 'Email service is not configured. Please contact support.');
    }

    return res.status(200).json(new ApiResponse(200, null, 'Password reset email sent successfully'));
});

const resetPassword = asyncHandler(async (req, res) => {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token?.trim()) {
        throw new ApiError(400, 'Reset token is required');
    }
    if (!newPassword || !confirmPassword) {
        throw new ApiError(400, 'New password and confirm password are required');
    }
    if (newPassword !== confirmPassword) {
        throw new ApiError(400, 'Passwords do not match');
    }
    if (newPassword.length < 6) {
        throw new ApiError(400, 'Password must be at least 6 characters long');
    }

    // Hash the token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token.trim()).digest('hex');

    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
        throw new ApiError(400, 'Invalid or expired reset token');
    }

    // Update password and clear reset token
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshToken = null; // Invalidate all sessions
    await user.save();

    return res.status(200).json(new ApiResponse(200, null, 'Password reset successful. Please login with your new password.'));
});


const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(400, 'Refresh token is required');
    }

    const decoded = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decoded?.userId);

    if (!user) {
        throw new ApiError(404, 'User not found');
    }
    if (incomingRefreshToken !== user.refreshToken) {
        throw new ApiError(401, 'Invalid refresh token');
    }

    const isHttps = process.env.FRONTEND_URL?.startsWith('https://');
    const cookieOptions = {
        httpOnly: true,
        secure: !!isHttps,
        sameSite: isHttps ? 'none' : 'lax',
        path: '/',
    };

    try {
        const { accessToken, refreshToken } = await generateRefreshAndAccessToken(user._id);
        return res
            .status(200)
            .cookie('accessToken', accessToken, cookieOptions)
            .cookie('refreshToken', refreshToken, cookieOptions)
            .json(new ApiResponse(200, { accessToken, refreshToken }, 'Access token refreshed successfully'));
    } catch (error) {
        throw new ApiError(500, 'Unable to refresh access token');
    }
});

export {
    registerUser,
    loginUser,
    logOutUser,
    changePassword,
    getCurrentUser,
    updateAccount,
    refreshAccessToken,
    forgotPassword,
    resetPassword,
};
