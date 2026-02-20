import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/apiError.js';
import ApiResponse from '../utils/apiResponse.js';
import { AdminPage } from '../model/adminPage.model.js';
import { AdminMedia } from '../model/adminMedia.model.js';
import { deleteFromCloudinary, isCloudinaryEnabled, uploadToCloudinary } from '../utils/cloudinary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '..', 'uploads');

const toAdminUser = (user) =>
    user
        ? {
              id: user._id?.toString(),
              name: user.fullName || user.username,
              email: user.email,
          }
        : undefined;

const toAdminPageDTO = (page) => ({
    id: page.slug,
    title: page.title,
    slug: page.slug,
    status: page.status,
    updatedAt: page.updatedAt,
    updatedBy: toAdminUser(page.updatedBy),
    seo: page.seo,
    blocks: page.blocks,
});

const toAdminPageSummaryDTO = (page) => ({
    id: page.slug,
    title: page.title,
    slug: page.slug,
    status: page.status,
    updatedAt: page.updatedAt,
    updatedBy: toAdminUser(page.updatedBy),
});

const toAdminMediaDTO = (media) => ({
    id: media._id.toString(),
    url: media.url,
    title: media.title,
    alt: media.alt,
    createdAt: media.createdAt,
});

export const listAdminPages = asyncHandler(async (_req, res) => {
    const pages = await AdminPage.find()
        .sort({ updatedAt: -1 })
        .populate('updatedBy', 'fullName username email')
        .lean();
    const data = pages.map((page) => toAdminPageSummaryDTO(page));
    return res.status(200).json(new ApiResponse(200, data, 'Admin pages fetched'));
});

export const getAdminPage = asyncHandler(async (req, res) => {
    const identifier = req.params.id;
    const query = mongoose.isValidObjectId(identifier)
        ? { _id: identifier }
        : { slug: identifier.toLowerCase() };
    const page = await AdminPage.findOne(query)
        .populate('updatedBy', 'fullName username email')
        .lean();
    if (!page) throw new ApiError(404, 'Admin page not found');
    return res.status(200).json(new ApiResponse(200, toAdminPageDTO(page), 'Admin page fetched'));
});

export const updateAdminPage = asyncHandler(async (req, res) => {
    const { title, slug, status, seo, blocks } = req.body;

    if (!title?.trim()) {
        throw new ApiError(400, 'Page title is required');
    }
    if (!slug?.trim()) {
        throw new ApiError(400, 'Page slug is required');
    }

    const normalizedSlug = slug.toLowerCase().trim();
    const identifier = req.params.id;
    const query = mongoose.isValidObjectId(identifier)
        ? { _id: identifier }
        : { slug: identifier.toLowerCase() };
    const currentPage = await AdminPage.findOne(query);
    if (!currentPage) {
        throw new ApiError(404, 'Admin page not found');
    }

    const existing = await AdminPage.findOne({
        _id: { $ne: currentPage._id },
        slug: normalizedSlug,
    });
    if (existing) {
        throw new ApiError(409, 'Slug already in use');
    }

    const update = {
        title: title.trim(),
        slug: normalizedSlug,
        status: status === 'published' ? 'published' : 'draft',
        seo: {
            metaTitle: seo?.metaTitle ?? title.trim(),
            metaDescription: seo?.metaDescription ?? '',
            slug: normalizedSlug,
            canonical: seo?.canonical ?? '',
            ogImage: seo?.ogImage ?? '',
        },
        blocks: Array.isArray(blocks) ? blocks : [],
        updatedBy: req.user?._id,
    };

    const updatedPage = await AdminPage.findByIdAndUpdate(currentPage._id, update, {
        new: true,
        runValidators: true,
    }).populate('updatedBy', 'fullName username email');

    if (!updatedPage) {
        throw new ApiError(404, 'Admin page not found');
    }

    return res
        .status(200)
        .json(new ApiResponse(200, toAdminPageDTO(updatedPage), 'Admin page updated'));
});

export const listAdminMedia = asyncHandler(async (_req, res) => {
    const media = await AdminMedia.find().sort({ createdAt: -1 }).lean();
    const data = media.map((item) => toAdminMediaDTO(item));
    return res.status(200).json(new ApiResponse(200, data, 'Media fetched'));
});

export const uploadAdminMedia = asyncHandler(async (req, res) => {
    const fileUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const url = fileUrl || req.body?.url;

    if (!url) {
        throw new ApiError(400, 'Media file or URL is required');
    }

    let mediaUrl = url;
    let provider = req.file ? 'local' : 'external';
    let publicId = '';

    if (req.file && isCloudinaryEnabled()) {
        try {
            const uploaded = await uploadToCloudinary(req.file.path);
            if (uploaded?.url) {
                mediaUrl = uploaded.url;
                publicId = uploaded.publicId || '';
                provider = 'cloudinary';
            }
        } catch {
            provider = 'local';
        }
    }

    const media = await AdminMedia.create({
        url: mediaUrl,
        localUrl: fileUrl || '',
        title: req.body?.title || '',
        alt: req.body?.alt || '',
        provider,
        publicId,
        createdBy: req.user?._id,
    });

    return res.status(201).json(new ApiResponse(201, toAdminMediaDTO(media), 'Media uploaded'));
});

export const deleteAdminMedia = asyncHandler(async (req, res) => {
    const media = await AdminMedia.findByIdAndDelete(req.params.id);
    if (!media) throw new ApiError(404, 'Media not found');

    if (media.provider === 'cloudinary' && media.publicId) {
        deleteFromCloudinary(media.publicId).catch(() => {});
    }

    const localPath = media.localUrl?.startsWith('/uploads/')
        ? media.localUrl
        : media.url?.startsWith('/uploads/')
          ? media.url
          : null;

    if (localPath) {
        const filePath = path.join(uploadsDir, path.basename(localPath));
        fs.promises.unlink(filePath).catch(() => {});
    }

    return res.status(200).json(new ApiResponse(200, null, 'Media deleted'));
});

