import mongoose, { Schema } from 'mongoose';

const seoSchema = new Schema(
    {
        metaTitle: { type: String, default: '' },
        metaDescription: { type: String, default: '' },
        slug: { type: String, default: '' },
        canonical: { type: String, default: '' },
        ogImage: { type: String, default: '' },
    },
    { _id: false }
);

const adminPageSchema = new Schema(
    {
        title: { type: String, required: true, trim: true },
        slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
        status: { type: String, enum: ['draft', 'published'], default: 'draft' },
        seo: { type: seoSchema, default: () => ({}) },
        blocks: { type: [Schema.Types.Mixed], default: [] },
        updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
);

export const AdminPage = mongoose.model('AdminPage', adminPageSchema);
