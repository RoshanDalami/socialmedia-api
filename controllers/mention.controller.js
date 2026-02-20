import { Mention } from '../model/mention.model.js';
import { Project } from '../model/project.model.js';
import ApiResponse from '../utils/apiResponse.js';
import ApiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';

export const listMentions = asyncHandler(async (req, res) => {
    const { projectId, source, sentiment, from, to, page = 1, limit = 20, sort = 'recent' } = req.query;

    if (!projectId) {
        throw new ApiError(400, 'projectId is required');
    }

    const project = await Project.findOne({ _id: projectId, userId: req.user._id });
    if (!project) {
        throw new ApiError(404, 'Project not found');
    }

    const filter = { projectId };
    if (source) filter.source = source;
    if (sentiment) filter['sentiment.label'] = sentiment;
    if (from || to) {
        filter.publishedAt = {};
        if (from) filter.publishedAt.$gte = new Date(from);
        if (to) filter.publishedAt.$lte = new Date(to);
    }

    // Parse pagination params
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    // Determine sort order
    let sortOption = { publishedAt: -1 }; // default: recent first
    if (sort === 'oldest') {
        sortOption = { publishedAt: 1 };
    } else if (sort === 'reach') {
        sortOption = { reachEstimate: -1, publishedAt: -1 };
    }

    // Execute queries in parallel for efficiency
    const [mentions, totalCount] = await Promise.all([
        Mention.find(filter).sort(sortOption).skip(skip).limit(limitNum),
        Mention.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    return res.status(200).json(new ApiResponse(200, {
        mentions,
        pagination: {
            page: pageNum,
            limit: limitNum,
            totalCount,
            totalPages,
            hasNextPage: pageNum < totalPages,
            hasPrevPage: pageNum > 1
        }
    }, 'Mentions fetched'));
});
