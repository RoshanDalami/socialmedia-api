import { FacebookAdsApi, Page, IGUser } from 'facebook-nodejs-business-sdk';

/**
 * Meta Connector
 * 
 * IMPORTANT: The Meta Graph API only allows access to:
 * - Facebook Pages you own/manage
 * - Instagram Business accounts linked to those pages
 * 
 * Required Environment Variables:
 * - META_ACCESS_TOKEN: Long-lived Page Access Token
 * - META_PAGE_ID: Facebook Page ID to monitor (optional, will fetch all accessible pages)
 * 
 * Required Permissions:
 * - pages_read_engagement
 * - pages_read_user_content
 * - instagram_basic
 * - instagram_manage_comments
 */

const FIELDS = {
    POST: 'id,message,created_time,permalink_url,shares,reactions.summary(true),comments.summary(true)',
    COMMENT: 'id,message,created_time,from,like_count',
    IG_MEDIA: 'id,caption,timestamp,permalink,like_count,comments_count,media_type',
    IG_COMMENT: 'id,text,timestamp,username,like_count',
};

const metaConnector = {
    id: 'meta',
    displayName: 'Meta (Owned Assets Only)',
    enabledByDefault: false,
    capabilities: {
        realtime: false,
        search: false,
        limits: 'Owned pages/IG business accounts only; no global keyword search.',
    },

    async run({ project }) {
        const accessToken = process.env.META_ACCESS_TOKEN;
        if (!accessToken) {
            return [];
        }
        const keywords = Array.isArray(project?.keywords) ? project.keywords : [];

        FacebookAdsApi.init(accessToken);
        const results = [];

        try {
            // Fetch Facebook Page posts
            const pageId = process.env.META_PAGE_ID;
            if (pageId) {
                const fbPosts = await this.fetchFacebookPosts(pageId, keywords);
                results.push(...fbPosts);
            }

            // Fetch Instagram Business posts if connected
            const igUserId = process.env.META_IG_USER_ID;
            if (igUserId) {
                const igPosts = await this.fetchInstagramPosts(igUserId, keywords);
                results.push(...igPosts);
            }
        } catch (error) {
            console.error('[MetaConnector] Error fetching data:', error.message);
            // Return empty array on error rather than throwing
            // This allows other connectors to continue
        }

        return results;
    },

    async fetchFacebookPosts(pageId, keywords = []) {
        const results = [];
        try {
            const page = new Page(pageId);
            const posts = await page.getPosts([FIELDS.POST], {
                limit: 50,
                since: Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60), // Last 7 days
            });

            for (const post of posts) {
                const postData = post._data || post;
                const text = postData.message || '';
                
                // Check if post matches keywords (if any)
                if (keywords.length > 0 && !this.matchesKeywords(text, keywords)) {
                    continue;
                }

                results.push({
                    source: 'facebook',
                    title: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
                    text: text,
                    author: 'Page Post',
                    url: postData.permalink_url || `https://facebook.com/${postData.id}`,
                    publishedAt: new Date(postData.created_time),
                    engagement: {
                        likes: postData.reactions?.summary?.total_count || 0,
                        comments: postData.comments?.summary?.total_count || 0,
                        shares: postData.shares?.count || 0,
                    },
                    reachEstimate: this.estimateReach(postData),
                });

                // Also fetch comments that match keywords
                if (postData.comments?.data) {
                    for (const comment of postData.comments.data) {
                        const commentText = comment.message || '';
                        if (keywords.length > 0 && !this.matchesKeywords(commentText, keywords)) {
                            continue;
                        }
                        results.push({
                            source: 'facebook',
                            title: `Comment on post`,
                            text: commentText,
                            author: comment.from?.name || 'Unknown',
                            url: postData.permalink_url || `https://facebook.com/${postData.id}`,
                            publishedAt: new Date(comment.created_time),
                            engagement: {
                                likes: comment.like_count || 0,
                                comments: 0,
                                shares: 0,
                            },
                            reachEstimate: 0,
                        });
                    }
                }
            }
        } catch (error) {
            console.error('[MetaConnector] Facebook fetch error:', error.message);
        }
        return results;
    },

    async fetchInstagramPosts(igUserId, keywords = []) {
        const results = [];
        try {
            const igUser = new IGUser(igUserId);
            const media = await igUser.getMedia([FIELDS.IG_MEDIA], {
                limit: 50,
            });

            for (const item of media) {
                const itemData = item._data || item;
                const text = itemData.caption || '';
                
                // Check if post matches keywords (if any)
                if (keywords.length > 0 && !this.matchesKeywords(text, keywords)) {
                    continue;
                }

                results.push({
                    source: 'instagram',
                    title: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
                    text: text,
                    author: 'Instagram Post',
                    url: itemData.permalink || `https://instagram.com/p/${itemData.id}`,
                    publishedAt: new Date(itemData.timestamp),
                    engagement: {
                        likes: itemData.like_count || 0,
                        comments: itemData.comments_count || 0,
                        shares: 0,
                    },
                    reachEstimate: (itemData.like_count || 0) * 10,
                });
            }
        } catch (error) {
            console.error('[MetaConnector] Instagram fetch error:', error.message);
        }
        return results;
    },

    matchesKeywords(text, keywords) {
        if (!text || keywords.length === 0) return true;
        const lowerText = text.toLowerCase();
        return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
    },

    estimateReach(postData) {
        const reactions = postData.reactions?.summary?.total_count || 0;
        const comments = postData.comments?.summary?.total_count || 0;
        const shares = postData.shares?.count || 0;
        // Simple reach estimation formula
        return (reactions * 5) + (comments * 10) + (shares * 50);
    },
};

export default metaConnector;
