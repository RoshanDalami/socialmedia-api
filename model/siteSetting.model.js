import mongoose, { Schema } from 'mongoose';

const siteSettingSchema = new Schema(
    {
        key: { type: String, default: 'global', unique: true, index: true },
        brandName: { type: String, default: 'NPIP' },
        tagline: { type: String, default: "Nepal is listening" },
        logoUrl: { type: String, default: '' },
        accentColor: { type: String, default: '#d86b2c' },
        socialLinks: {
            type: [
                {
                    label: { type: String, required: true },
                    href: { type: String, required: true },
                },
            ],
            default: [],
        },
    },
    { timestamps: true }
);

export const SiteSetting = mongoose.model('SiteSetting', siteSettingSchema);
