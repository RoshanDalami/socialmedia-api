import mongoose, { Schema } from 'mongoose';

const mentionSchema = new Schema(
    {
        projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
        source: { type: String, required: true, index: true },
        keywordMatched: { type: String, default: '' },
        title: { type: String, default: '' },
        text: { type: String, default: '' },
        author: { type: String, default: '' },
        url: { type: String, default: null },
        publishedAt: { type: Date, default: null },
        engagement: {
            likes: { type: Number, default: 0 },
            comments: { type: Number, default: 0 },
            shares: { type: Number, default: 0 },
        },
        followerCount: { type: Number, default: 0 },
        reachEstimate: { type: Number, default: 0 },
        lang: { type: String, default: 'unknown' },
        geo: { type: String, default: '' },
        sentiment: {
            label: { type: String, default: 'neutral' },
            confidence: { type: Number, default: 0 },
        },
        similarityHash: { type: String, default: null },
        ingestedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

mentionSchema.index({ projectId: 1, source: 1, url: 1 }, { unique: true, sparse: true });
mentionSchema.index({ projectId: 1, similarityHash: 1 }, { unique: true, sparse: true });
mentionSchema.index({ projectId: 1, publishedAt: -1 });
mentionSchema.index({ projectId: 1, ingestedAt: -1 });

export const Mention = mongoose.model('Mention', mentionSchema);
