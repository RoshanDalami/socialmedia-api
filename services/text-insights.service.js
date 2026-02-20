import nlp from 'compromise';

const STOPWORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'for', 'on', 'with',
    'from', 'by', 'at', 'as', 'is', 'are', 'was', 'were', 'will', 'says',
    'said', 'after', 'before', 'over', 'into', 'about', 'amid', 'against',
    'near', 'up', 'out', 'new', 'nepal',
]);

const MIN_TOKEN_LENGTH = 4;
const MIN_QUOTE_LENGTH = 8;
const MAX_QUOTE_LENGTH = 180;

const normalizeToken = (value) =>
    value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export const extractQuotes = (text, limit = 6) => {
    if (!text) return [];

    const regex = /"([^"]{8,180})"/g;
    const quotes = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
        const quote = match[1].trim();
        if (quote && !quotes.includes(quote)) {
            quotes.push(quote);
        }
    }

    return quotes.slice(0, limit);
};

export const extractTopics = (text, limit = 8) => {
    if (!text) return [];

    const tokens = normalizeToken(text).split(' ').filter(Boolean);
    const counts = new Map();

    for (const token of tokens) {
        if (token.length < MIN_TOKEN_LENGTH || STOPWORDS.has(token)) continue;
        counts.set(token, (counts.get(token) || 0) + 1);
    }

    return Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([topic, count]) => ({ topic, count }));
};

export const extractLocations = (text, limit = 6) => {
    if (!text) return [];

    const doc = nlp(text);
    const places = doc.places().out('array');
    const counts = new Map();

    for (const place of places) {
        const key = place.trim();
        if (!key) continue;
        counts.set(key, (counts.get(key) || 0) + 1);
    }

    return Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([name, count]) => ({ name, count }));
};
