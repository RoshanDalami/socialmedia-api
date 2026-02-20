import mongoose, { Schema } from 'mongoose';

const adminMediaSchema = new Schema(
    {
        url: { type: String, required: true },
        localUrl: { type: String, default: '' },
        title: { type: String, default: '' },
        alt: { type: String, default: '' },
        provider: { type: String, enum: ['local', 'cloudinary', 'external'], default: 'local' },
        publicId: { type: String, default: '' },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
);

adminMediaSchema.index({ createdAt: -1 });

export const AdminMedia = mongoose.model('AdminMedia', adminMediaSchema);
