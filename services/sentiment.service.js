import { pipeline } from '@xenova/transformers';

let sentimentPipeline = null;

const DEVANAGARI_REGEX = /[\u0900-\u097F]/;
const LATIN_REGEX = /[a-zA-Z]/;
const MAX_TEXT_LENGTH = 512;

const loadPipeline = async () => {
    if (!sentimentPipeline) {
        sentimentPipeline = await pipeline(
            'sentiment-analysis',
            'Xenova/bert-base-multilingual-uncased-sentiment'
        );
    }
    return sentimentPipeline;
};

export const detectLanguage = (text = '') => {
    if (DEVANAGARI_REGEX.test(text)) return 'ne';
    if (LATIN_REGEX.test(text)) return 'en';
    return 'unknown';
};

const fallbackSentiment = (text) => {
    const lower = text.toLowerCase();
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful'];
    const negativeWords = ['bad', 'terrible', 'poor', 'awful', 'horrible'];

    if (positiveWords.some((word) => lower.includes(word))) {
        return { label: 'positive', confidence: 0.4 };
    }
    if (negativeWords.some((word) => lower.includes(word))) {
        return { label: 'negative', confidence: 0.4 };
    }
    return { label: 'neutral', confidence: 0.2 };
};

export const inferSentiment = async (text = '') => {
    const trimmed = text.trim();
    if (!trimmed) {
        return { label: 'neutral', confidence: 0 };
    }

    try {
        const model = await loadPipeline();
        const output = await model(trimmed.slice(0, MAX_TEXT_LENGTH));
        const top = Array.isArray(output) ? output[0] : output;
        return {
            label: top?.label?.toLowerCase() || 'neutral',
            confidence: Number(top?.score || 0),
        };
    } catch {
        return fallbackSentiment(trimmed);
    }
};
