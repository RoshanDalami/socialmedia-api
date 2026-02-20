import fetch from 'node-fetch';

const FETCH_TIMEOUT_MS = 15_000;
const USER_AGENT = 'NPIP/1.0';
const POSTS_LIMIT = 10;

const SUBREDDITS = Object.freeze(['Nepal', 'NepalPolitics', 'Nepali', 'NepalSocial']);

const fetchJson = async (url) => {
    const res = await fetch(url, {
        timeout: FETCH_TIMEOUT_MS,
        headers: { 'User-Agent': USER_AGENT },
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Reddit API failed: ${res.status} ${text}`);
    }
    return res.json();
};

const buildSearchUrl = (subreddit, query) =>
    `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&restrict_sr=1&sort=new&limit=${POSTS_LIMIT}`;

const mapPostToMention = (post) => ({
    source: 'reddit',
    title: post.title || '',
    text: post.selftext || '',
    author: post.author || '',
    url: `https://www.reddit.com${post.permalink || ''}`,
    publishedAt: post.created_utc ? new Date(post.created_utc * 1000) : null,
    engagement: {
        likes: post.ups || 0,
        comments: post.num_comments || 0,
        shares: 0,
    },
    followerCount: 0,
});

const redditConnector = {
    id: 'reddit',
    displayName: 'Reddit (r/Nepal)',
    enabledByDefault: true,
    capabilities: {
        realtime: false,
        search: true,
        limits: 'Public search JSON; no private communities.',
    },
    async run({ project }) {
        const query = project.keywords.join(' ') || project.booleanQuery || project.name;
        const mentions = [];

        for (const subreddit of SUBREDDITS) {
            const data = await fetchJson(buildSearchUrl(subreddit, query));
            const posts = data?.data?.children || [];
            mentions.push(...posts.map((item) => mapPostToMention(item.data || {})));
        }

        return mentions;
    },
};

export default redditConnector;
