import crypto from 'crypto';

const normalizeText = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export const createSimilarityHash = (value = '') => {
    const normalized = normalizeText(value);
    if (!normalized) return '';
    return crypto.createHash('sha256').update(normalized).digest('hex');
};
