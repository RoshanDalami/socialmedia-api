import fetch from 'node-fetch';

const GNEWS_BASE_URL = 'https://gnews.io/api/v4/search';
const DEFAULT_LIMIT = 5;

export const fetchNews = async (query, limit = DEFAULT_LIMIT) => {
    const apiKey = process.env.GNEWS_API_KEY;

    if (!apiKey) {
        return { articles: [], warning: 'GNEWS_API_KEY is not configured' };
    }

    const resolvedLimit = Number(process.env.NEWS_LIMIT) || limit;
    const searchQuery = `${query} Nepal`;
    const url = `${GNEWS_BASE_URL}?q=${encodeURIComponent(searchQuery)}&lang=en&country=np&max=${resolvedLimit}&token=${apiKey}`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error('Failed to fetch news');
    }

    const data = await response.json();

    const articles = (data?.articles || []).map((article) => ({
        title: article.title,
        description: article.description || '',
        url: article.url,
        source: article?.source?.name || '',
        publishedAt: article.publishedAt,
        image: article.image || '',
    }));

    return { articles };
};
