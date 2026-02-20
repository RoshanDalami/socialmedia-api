import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/apiError.js';
import ApiResponse from '../utils/apiResponse.js';
import { AdminPage } from '../model/adminPage.model.js';

const toPublicPageDTO = (page) => ({
    id: page.slug,
    title: page.title,
    slug: page.slug,
    status: page.status,
    updatedAt: page.updatedAt,
    seo: page.seo,
    blocks: page.blocks,
});

export const getPublishedPage = asyncHandler(async (req, res) => {
    const slug = req.params.slug?.toLowerCase();
    if (!slug) {
        throw new ApiError(400, 'Slug is required');
    }

    const page = await AdminPage.findOne({ slug, status: 'published' }).lean();
    if (!page) {
        throw new ApiError(404, 'Page not found');
    }

    return res.status(200).json(new ApiResponse(200, toPublicPageDTO(page), 'Page fetched'));
});

export const listPublishedPages = asyncHandler(async (_req, res) => {
    const pages = await AdminPage.find({ status: 'published' }, { title: 1, slug: 1, updatedAt: 1 })
        .sort({ updatedAt: -1 })
        .lean();

    const data = pages.map((page) => ({
        id: page.slug,
        title: page.title,
        slug: page.slug,
        updatedAt: page.updatedAt,
    }));

    return res.status(200).json(new ApiResponse(200, data, 'Pages fetched'));
});
