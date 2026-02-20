import { Mention } from '../model/mention.model.js';

export const getProjectMetrics = async (projectId, { from, to } = {}) => {
    const basePipeline = [
        { $match: { projectId } },
        {
            $addFields: {
                metricDate: { $ifNull: ['$publishedAt', { $ifNull: ['$ingestedAt', '$createdAt'] }] },
            },
        },
    ];
    if (from || to) {
        const dateFilter = {};
        if (from) dateFilter.$gte = from;
        if (to) dateFilter.$lte = to;
        basePipeline.push({ $match: { metricDate: dateFilter } });
    }

    const [volume, sentimentShare, topSources, topAuthors] = await Promise.all([
        Mention.aggregate([
            ...basePipeline,
            {
                $group: {
                    _id: {
                        year: { $year: '$metricDate' },
                        month: { $month: '$metricDate' },
                        day: { $dayOfMonth: '$metricDate' },
                    },
                    count: { $sum: 1 },
                },
            },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
        ]),
        Mention.aggregate([
            ...basePipeline,
            { $group: { _id: '$sentiment.label', count: { $sum: 1 } } },
        ]),
        Mention.aggregate([
            ...basePipeline,
            { $group: { _id: '$source', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
        ]),
        Mention.aggregate([
            ...basePipeline,
            { $group: { _id: '$author', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
        ]),
    ]);

    const totalMentions = volume.reduce((sum, row) => sum + (row.count || 0), 0);
    return { totalMentions, volume, sentimentShare, topSources, topAuthors };
};
