import mongoose, { Schema } from 'mongoose';

const sourceSchema = new Schema(
    {
        localNews: { type: Boolean, default: true },
        youtube: { type: Boolean, default: true },
        reddit: { type: Boolean, default: true },
        x: { type: Boolean, default: true },
        meta: { type: Boolean, default: true },
        tiktok: { type: Boolean, default: false },
        viber: { type: Boolean, default: false },
    },
    { _id: false }
);

const projectSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        name: { type: String, required: true, trim: true },
        keywords: { type: [String], default: [] },
        booleanQuery: { type: String, default: '' },
        sources: { type: sourceSchema, default: () => ({}) },
        scheduleMinutes: { type: Number, default: 30, min: 5, max: 60 },
        geoFocus: { type: String, default: 'Nepal' },
        status: { type: String, enum: ['active', 'paused'], default: 'active' },
        lastRunAt: { type: Date, default: null },
    },
    { timestamps: true }
);

projectSchema.index({ userId: 1, name: 1 }, { unique: true });

export const Project = mongoose.model('Project', projectSchema);
