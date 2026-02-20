import fetch from 'node-fetch';

const API_BASE = 'https://www.googleapis.com/youtube/v3';
const FETCH_TIMEOUT_MS = 15_000;
const MAX_RESULTS = 5;

const fetchJson = async (url) => {
    const res = await fetch(url, { timeout: FETCH_TIMEOUT_MS });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`YouTube API failed: ${res.status} ${text}`);
    }
    return res.json();
};

const buildSearchUrl = (query, apiKey) =>
    `${API_BASE}/search?part=snippet&type=video&maxResults=${MAX_RESULTS}&q=${encodeURIComponent(query)}&key=${apiKey}`;

const buildVideosUrl = (videoIds, apiKey) =>
    `${API_BASE}/videos?part=snippet,statistics&id=${videoIds.join(',')}&key=${apiKey}`;

const mapVideoToMention = (video) => ({
    source: 'youtube',
    title: video.snippet?.title || '',
    text: video.snippet?.description || '',
    author: video.snippet?.channelTitle || '',
    url: `https://www.youtube.com/watch?v=${video.id}`,
    publishedAt: video.snippet?.publishedAt || null,
    engagement: {
        likes: Number(video.statistics?.likeCount || 0),
        comments: Number(video.statistics?.commentCount || 0),
        shares: 0,
    },
    followerCount: 0,
});

const youtubeConnector = {
    id: 'youtube',
    displayName: 'YouTube',
    enabledByDefault: true,
    capabilities: {
        realtime: false,
        search: true,
        limits: 'Requires API key; comments limited to top threads.',
    },
    async run({ project }) {
        const apiKey = process.env.YOUTUBE_API_KEY;
        if (!apiKey) {
            return [];
        }

        const query = project.keywords.join(' ') || project.booleanQuery || project.name;
        const searchData = await fetchJson(buildSearchUrl(query, apiKey));
        const videoIds = (searchData.items || []).map((item) => item.id.videoId).filter(Boolean);

        if (!videoIds.length) return [];

        const videosData = await fetchJson(buildVideosUrl(videoIds, apiKey));
        return (videosData.items || []).map(mapVideoToMention);
    },
};

export default youtubeConnector;
