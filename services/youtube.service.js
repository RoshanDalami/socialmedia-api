import fetch from 'node-fetch';

const YOUTUBE_SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';
const DEFAULT_LIMIT = 5;

export const fetchYouTubeVideos = async (query, limit = DEFAULT_LIMIT) => {
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
        return { videos: [], warning: 'YOUTUBE_API_KEY is not configured' };
    }

    const resolvedLimit = Number(process.env.YOUTUBE_LIMIT) || limit;
    const searchQuery = `${query} Nepal interview speech`;
    const url = `${YOUTUBE_SEARCH_URL}?part=snippet&type=video&maxResults=${resolvedLimit}&q=${encodeURIComponent(searchQuery)}&key=${apiKey}`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error('Failed to fetch YouTube videos');
    }

    const data = await response.json();

    const videos = (data?.items || []).map((item) => ({
        id: item?.id?.videoId || '',
        title: item?.snippet?.title || '',
        description: item?.snippet?.description || '',
        publishedAt: item?.snippet?.publishedAt || '',
        channelTitle: item?.snippet?.channelTitle || '',
        thumbnail: item?.snippet?.thumbnails?.medium?.url || '',
        url: item?.id?.videoId ? `https://www.youtube.com/watch?v=${item.id.videoId}` : '',
    }));

    return { videos };
};
