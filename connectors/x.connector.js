import { TwitterApi } from 'twitter-api-v2';

const MAX_RESULTS = 10;
const DEFAULT_ENGAGEMENT = Object.freeze({ likes: 0, comments: 0, shares: 0 });

const mapTweetToMention = (tweet) => ({
    source: 'x',
    title: '',
    text: tweet.text || '',
    author: tweet.author_id || '',
    url: `https://twitter.com/i/web/status/${tweet.id}`,
    publishedAt: tweet.created_at || null,
    engagement: DEFAULT_ENGAGEMENT,
    followerCount: 0,
});

const xConnector = {
    id: 'x',
    displayName: 'X (Twitter)',
    enabledByDefault: false,
    capabilities: {
        realtime: false,
        search: true,
        limits: 'Requires paid API access; v2 recent search only.',
    },
    async run({ project }) {
        const bearerToken = process.env.TWITTER_BEARER_TOKEN;
        if (!bearerToken) {
            return [];
        }

        const client = new TwitterApi(bearerToken);
        const query = project.keywords.join(' ') || project.booleanQuery || project.name;
        const results = await client.v2.search(query, { max_results: MAX_RESULTS });

        return (results.data || []).map(mapTweetToMention);
    },
};

export default xConnector;
