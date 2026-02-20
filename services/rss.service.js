import fetch from 'node-fetch';
import { XMLParser } from 'fast-xml-parser';

const RSS_FEEDS = [
    { name: 'The Kathmandu Post', url: 'https://kathmandupost.com/rss' },
    { name: 'The Himalayan Times', url: 'https://thehimalayantimes.com/feed' },
    { name: 'Republica', url: 'https://myrepublica.nagariknetwork.com/rss' },
    { name: 'Onlinekhabar', url: 'https://english.onlinekhabar.com/feed' },
    { name: 'Nepali Times', url: 'https://www.nepalitimes.com/feed/' },
    { name: 'Setopati', url: 'https://en.setopati.com/rss' },
];

const parser = new XMLParser({ ignoreAttributes: false });

const normalize = (value = '') =>
    value
        .toLowerCase()
        .replace(/[^a-z0-9\s]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const buildTerms = (query, aliases = []) => {
    const terms = new Set();
    const push = (value) => {
        const normalized = normalize(value);
        if (normalized.length >= 3) terms.add(normalized);
    };

    push(query);
    aliases.forEach(push);

    const queryTokens = normalize(query).split(' ').filter((token) => token.length >= 3);
    queryTokens.forEach((token) => terms.add(token));

    return Array.from(terms);
};

const normalizeItems = (items, sourceName) => {
    if (!items) return [];
    const list = Array.isArray(items) ? items : [items];

    return list.map((item) => ({
        title: item?.title || '',
        description: item?.description || item?.summary || '',
        url: item?.link || '',
        source: sourceName,
        publishedAt: item?.pubDate || item?.published || item?.['dc:date'] || '',
        image: item?.enclosure?.['@_url'] || '',
    }));
};

const fetchFeed = async (feed) => {
    try {
        const response = await fetch(feed.url);
        if (!response.ok) return [];

        const xml = await response.text();
        const parsed = parser.parse(xml);
        const channel = parsed?.rss?.channel || parsed?.feed;
        const items = channel?.item || channel?.entry;

        return normalizeItems(items, feed.name);
    } catch {
        return [];
    }
};

export const fetchRssNews = async (query, aliases = []) => {
    const results = await Promise.all(RSS_FEEDS.map(fetchFeed));
    const flattened = results.flat();
    const terms = buildTerms(query, aliases);

    if (!terms.length) return [];

    return flattened.filter((item) => {
        const haystack = normalize(`${item.title || ''} ${item.description || ''}`);
        return terms.some((term) => haystack.includes(term));
    });
};
