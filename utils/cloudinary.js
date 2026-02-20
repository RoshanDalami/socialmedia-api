import { v2 as cloudinary } from 'cloudinary';

const isCloudinaryEnabled = () =>
    Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

if (isCloudinaryEnabled()) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true,
    });
}

const uploadToCloudinary = async (filePath) => {
    const folder = process.env.CLOUDINARY_FOLDER || 'npip';
    const result = await cloudinary.uploader.upload(filePath, {
        folder,
        resource_type: 'image',
    });

    return {
        url: result.secure_url || result.url,
        publicId: result.public_id,
    };
};

const deleteFromCloudinary = async (publicId) => {
    if (!publicId) return;
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
};

export { isCloudinaryEnabled, uploadToCloudinary, deleteFromCloudinary };
