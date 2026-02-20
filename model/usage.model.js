import mongoose, { Schema } from 'mongoose';

const usageSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        month: { type: String, required: true },
        mentionsCount: { type: Number, default: 0 },
    },
    { timestamps: true }
);

usageSchema.index({ userId: 1, month: 1 }, { unique: true });

export const Usage = mongoose.model('Usage', usageSchema);
