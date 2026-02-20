import mongoose, { Schema } from 'mongoose';

const alertSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
        type: { type: String, required: true },
        message: { type: String, required: true },
        payload: { type: Schema.Types.Mixed, default: {} },
        readAt: { type: Date, default: null },
    },
    { timestamps: true }
);

alertSchema.index({ userId: 1, createdAt: -1 });

export const Alert = mongoose.model('Alert', alertSchema);
