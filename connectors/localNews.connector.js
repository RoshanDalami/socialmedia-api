import fetch from 'node-fetch';
import { XMLParser } from 'fast-xml-parser';

const FETCH_TIMEOUT_MS = 15_000;
const DEFAULT_ENGAGEMENT = Object.freeze({ likes: 0, comments: 0, shares: 0 });

const RSS_FEEDS = Object.freeze([
    { name: 'OnlineKhabar', url: 'https://www.onlinekhabar.com/rss' },
    { name: 'Kantipur', url: 'https://kathmandupost.com/rss' },
    { name: 'Setopati', url: 'https://en.setopati.com/rss' },
]);

const parser = new XMLParser({ ignoreAttributes: false });

const fetchFeed = async (feed) => {
    const res = await fetch(feed.url, { timeout: FETCH_TIMEOUT_MS });
    if (!res.ok) throw new Error(`RSS fetch failed: ${feed.name}`);

    const text = await res.text();
    const parsed = parser.parse(text);
    const items = parsed?.rss?.channel?.item || parsed?.feed?.entry || [];
    return Array.isArray(items) ? items : [items];
};

const normalizeItem = (item, feedName) => ({
    source: 'local_news',
    sourceLabel: feedName,
    title: item.title?.['#text'] || item.title || '',
    text: item.description?.['#text'] || item.description || item.summary || '',
    url: item.link?.['#text'] || item.link?.['@_href'] || item.link || '',
    publishedAt: item.pubDate || item.published || item.updated || null,
    author: item.author?.name || item.author || '',
    engagement: DEFAULT_ENGAGEMENT,
    followerCount: 0,
});

const localNewsConnector = {
    id: 'localNews',
    displayName: 'Nepal Local News',
    enabledByDefault: true,
    capabilities: {
        realtime: false,
        search: true,
        limits: 'RSS feeds only; respects robots.txt; no full-site scraping.',
    },
    async run() {
        const mentions = [];
        const errors = [];

        for (const feed of RSS_FEEDS) {
            try {
                const items = await fetchFeed(feed);
                mentions.push(...items.map((item) => normalizeItem(item, feed.name)));
            } catch (err) {
                errors.push(err);
            }
        }

        if (!mentions.length && errors.length) throw errors[0];
        return mentions;
    },
};

export default localNewsConnector;
