import { fetchWikiProfile } from '../services/wiki.service.js';
import { fetchNews } from '../services/news.service.js';
import { fetchRssNews } from '../services/rss.service.js';
import { fetchYouTubeVideos } from '../services/youtube.service.js';
import { fetchTranscriptPreview } from '../services/youtube-transcript.service.js';
import { extractLocations, extractQuotes, extractTopics } from '../services/text-insights.service.js';

const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS) || 1000 * 60 * 10;
const RECENT_ACTIVITIES_LIMIT = 3;
const EVENTS_LIMIT = 6;
const LOCATIONS_LIMIT = 5;
const LOCATION_WINDOW_HOURS = 24;

const STOPWORDS = Object.freeze(new Set([
    'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'for', 'on',
    'with', 'from', 'by', 'at', 'as', 'is', 'are', 'was', 'were',
    'will', 'says', 'said', 'after', 'before', 'over', 'into',
    'about', 'amid', 'against', 'near', 'up', 'out', 'new',
]));

const LOCATION_PATTERN =
    /\b(?:in|at|from|visited|arrived in|arrived at|met in|meeting in|rally in|speech in)\s+([A-Z][A-Za-z.\-]+(?:\s+[A-Z][A-Za-z.\-]+){0,3})/g;

const normalizeTitle = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const normalizeTokens = (value) => normalizeTitle(value).split(/\s+/).filter(Boolean);
const parseTimestamp = (dateStr) => Date.parse(dateStr || '') || 0;

const getQueryParam = (req, key) =>
    typeof req.query?.[key] === 'string' ? req.query[key].trim() : '';

const buildRecentActivities = (articles) =>
    articles.slice(0, RECENT_ACTIVITIES_LIMIT).map(({ title, publishedAt, source, url }) => ({
        title, publishedAt, source, url,
    }));

const dedupeArticles = (articles) => {
    const seenUrls = new Set();
    const seenTitles = new Set();

    return articles.filter((article) => {
        const url = article.url || '';
        const normalizedTitle = normalizeTitle(article.title || '');

        if ((url && seenUrls.has(url)) || (normalizedTitle && seenTitles.has(normalizedTitle))) {
            return false;
        }

        if (url) seenUrls.add(url);
        if (normalizedTitle) seenTitles.add(normalizedTitle);
        return true;
    });
};

const sortByDate = (articles) =>
    [...articles].sort((a, b) => parseTimestamp(b.publishedAt) - parseTimestamp(a.publishedAt));

const buildEventSignature = (title) => {
    if (!title) return '';
    return normalizeTitle(title)
        .split(' ')
        .filter((token) => token.length >= 3 && !STOPWORDS.has(token))
        .slice(0, 6)
        .join(' ');
};

const buildEventGroups = (articles) => {
    const groups = new Map();

    for (const article of articles) {
        const signature = buildEventSignature(article.title);
        const key = signature || normalizeTitle(article.title || '');
        if (!key) continue;

        if (!groups.has(key)) {
            groups.set(key, {
                title: article.title,
                latestPublishedAt: article.publishedAt,
                sources: new Set([article.source]),
                count: 1,
                url: article.url,
            });
        } else {
            const group = groups.get(key);
            group.count += 1;
            group.sources.add(article.source);

            if (parseTimestamp(article.publishedAt) > parseTimestamp(group.latestPublishedAt)) {
                group.latestPublishedAt = article.publishedAt;
                group.url = article.url;
                group.title = article.title;
            }
        }
    }

    return Array.from(groups.values())
        .map((group) => ({
            title: group.title,
            latestPublishedAt: group.latestPublishedAt,
            sources: Array.from(group.sources).filter(Boolean),
            count: group.count,
            url: group.url,
        }))
        .sort((a, b) => parseTimestamp(b.latestPublishedAt) - parseTimestamp(a.latestPublishedAt))
        .slice(0, EVENTS_LIMIT);
};

const extractLocationsFromArticles = (articles, windowHours = LOCATION_WINDOW_HOURS) => {
    const cutoff = Date.now() - windowHours * 60 * 60 * 1000;
    const seen = new Set();
    const locations = [];
    for (const article of articles) {
        const timestamp = parseTimestamp(article.publishedAt);
        if (!timestamp || timestamp < cutoff) continue;

        const text = `${article.title || ''} ${article.description || ''}`;
        let match = LOCATION_PATTERN.exec(text);

        while (match) {
            const place = match[1].trim();
            const key = place.toLowerCase();

            if (!seen.has(key)) {
                seen.add(key);
                locations.push({
                    name: place,
                    source: article.source,
                    publishedAt: article.publishedAt,
                    url: article.url,
                });
            }
            match = LOCATION_PATTERN.exec(text);
        }
    }

    return locations.slice(0, LOCATIONS_LIMIT);
};

const buildInsightText = (articles, transcripts = []) => {
    const articleText = articles
        .map((article) => `${article.title || ''} ${article.description || ''}`.trim())
        .filter(Boolean)
        .join(' ');
    return `${articleText} ${transcripts.flat().join(' ')}`.trim();
};

const filterRelevant = (articles, query, personName, aliases = []) => {
    const target = (personName || query || '').toLowerCase().trim();
    if (!target) return articles;

    const baseTokens = normalizeTokens(target).filter((t) => t.length >= 3 && !STOPWORDS.has(t));
    const aliasTokens = aliases
        .flatMap((alias) => normalizeTokens(alias))
        .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
    const tokens = [...new Set([...baseTokens, ...aliasTokens])];
    const lastName = baseTokens.length > 1 ? baseTokens[baseTokens.length - 1] : baseTokens[0];
    const hasStrongLastName = lastName?.length >= 3;
    const phraseCandidates = [...new Set([personName, query, ...aliases])]
        .map((value) => normalizeTitle(value || ''))
        .filter(Boolean);
    const supportingTokens = tokens.filter((token) => token !== lastName);
    const fallbackMinMatches = Math.min(2, tokens.length || 1);

    return articles.filter((article) => {
        const haystack = normalizeTitle(`${article.title || ''} ${article.description || ''}`);
        if (phraseCandidates.some((phrase) => haystack.includes(phrase))) return true;
        if (hasStrongLastName) {
            if (!haystack.includes(lastName)) return false;
            if (!supportingTokens.length) return true;
            const supportingHits = supportingTokens.reduce(
                (count, token) => count + (haystack.includes(token) ? 1 : 0),
                0
            );
            return supportingHits >= 1;
        }

        const hits = tokens.reduce((count, token) => count + (haystack.includes(token) ? 1 : 0), 0);
        return hits >= fallbackMinMatches;
    });
};

const cache = new Map();

const getCached = (key) => {
    const cached = cache.get(key);
    if (!cached) return null;
    if (Date.now() - cached.createdAt > CACHE_TTL_MS) {
        cache.delete(key);
        return null;
    }
    return cached.value;
};

const setCached = (key, value) => cache.set(key, { value, createdAt: Date.now() });

const buildSourceStatus = (result, warningOverride = null) => ({
    ok: result.status === 'fulfilled',
    warning: warningOverride || (result.status === 'rejected' ? `${result.reason?.message || 'Request failed'}` : null),
});

const collectWarnings = (...sources) =>
    sources.map((s) => s.warning).filter(Boolean);

const createEmptyResponse = (query, person, candidates) => ({
    query,
    person,
    candidates,
    isDisambiguation: true,
    recentActivities: [],
    recentLocations: [],
    news: [],
    events: [],
    videos: [],
    insights: { topics: [], quotes: [], locations: [] },
    metadata: {
        newsProvider: 'gnews',
        warning: 'Select the correct person to load news',
        sources: {
            gnews: { ok: false, warning: 'Select a person to load news' },
            rss: { ok: false, warning: 'Select a person to load news' },
            youtube: { ok: false, warning: 'Select a person to load videos' },
        },
    },
});

export const getFigureIdentity = async (req, res, next) => {
    try {
        const query = getQueryParam(req, 'query');
        if (!query) return res.status(400).json({ error: 'Query is required' });

        const cacheKey = `identity:${query.toLowerCase()}`;
        const cached = getCached(cacheKey);
        if (cached) return res.json(cached);

        const wikiPayload = await fetchWikiProfile(query);
        const responsePayload = {
            query,
            person: wikiPayload?.person || null,
            candidates: wikiPayload?.candidates || [],
            isDisambiguation: Boolean(wikiPayload?.isDisambiguation),
        };

        setCached(cacheKey, responsePayload);
        res.json(responsePayload);
    } catch (err) {
        next(err);
    }
};

export const getFigureNews = async (req, res, next) => {
    try {
        const name = getQueryParam(req, 'name');
        const query = getQueryParam(req, 'query') || name;
        const aliasesRaw = getQueryParam(req, 'aliases');
        const aliases = aliasesRaw ? aliasesRaw.split(',').map((v) => v.trim()).filter(Boolean) : [];

        if (!name) return res.status(400).json({ error: 'Name is required' });

        const cacheKey = `news:${name.toLowerCase()}:${query.toLowerCase()}:${aliases.join(',').toLowerCase()}`;
        const cached = getCached(cacheKey);
        if (cached) return res.json(cached);

        const [newsResult, rssResult] = await Promise.allSettled([
            fetchNews(query),
            fetchRssNews(name, [query, ...aliases]),
        ]);

        const newsPayload = newsResult.status === 'fulfilled' ? newsResult.value : { articles: [], warning: null };
        const rssArticles = rssResult.status === 'fulfilled' ? rssResult.value : [];

        const combined = dedupeArticles([...(newsPayload?.articles || []), ...rssArticles]);
        const filtered = filterRelevant(combined, query, name, aliases);
        const timeline = sortByDate(filtered);
        const combinedText = buildInsightText(timeline);

        const gnewsStatus = buildSourceStatus(newsResult, newsPayload?.warning);
        const rssStatus = buildSourceStatus(rssResult);
        const warnings = collectWarnings(gnewsStatus, rssStatus, { warning: newsPayload?.warning });

        const responsePayload = {
            query,
            name,
            recentActivities: buildRecentActivities(timeline),
            recentLocations: extractLocationsFromArticles(timeline),
            news: timeline,
            events: buildEventGroups(timeline),
            insights: {
                topics: extractTopics(combinedText),
                quotes: extractQuotes(combinedText),
                locations: extractLocations(combinedText),
            },
            metadata: {
                newsProvider: 'gnews+rss',
                warning: warnings.length ? [...new Set(warnings)].join(' | ') : null,
                sources: { gnews: gnewsStatus, rss: rssStatus },
            },
        };

        setCached(cacheKey, responsePayload);
        res.json(responsePayload);
    } catch (err) {
        next(err);
    }
};

export const getFigureVideos = async (req, res, next) => {
    try {
        const name = getQueryParam(req, 'name');
        if (!name) return res.status(400).json({ error: 'Name is required' });

        const cacheKey = `videos:${name.toLowerCase()}`;
        const cached = getCached(cacheKey);
        if (cached) return res.json(cached);

        const [youtubeResult] = await Promise.allSettled([fetchYouTubeVideos(name)]);
        const youtubePayload = youtubeResult.status === 'fulfilled' && youtubeResult.value
            ? youtubeResult.value
            : { videos: [], warning: 'YouTube request failed' };

        const videos = youtubePayload?.videos || [];
        const transcriptPreviews = await Promise.all(videos.map((video) => fetchTranscriptPreview(video.id)));

        const videosWithTranscripts = videos.map((video, index) => ({
            ...video,
            transcriptPreview: transcriptPreviews[index] || [],
        }));

        const combinedText = buildInsightText([], transcriptPreviews);
        const youtubeStatus = buildSourceStatus(youtubeResult, youtubePayload?.warning);

        const responsePayload = {
            name,
            videos: videosWithTranscripts,
            insights: {
                topics: extractTopics(combinedText),
                quotes: extractQuotes(combinedText),
                locations: extractLocations(combinedText),
            },
            metadata: {
                warning: youtubePayload?.warning || null,
                sources: { youtube: youtubeStatus },
            },
        };

        setCached(cacheKey, responsePayload);
        res.json(responsePayload);
    } catch (err) {
        next(err);
    }
};

export const searchFigure = async (req, res, next) => {
    try {
        const query = getQueryParam(req, 'query');
        if (!query) return res.status(400).json({ error: 'Query is required' });

        const cacheKey = `search:${query.toLowerCase()}`;
        const cached = getCached(cacheKey);
        if (cached) return res.json(cached);

        const wikiPayload = await fetchWikiProfile(query);
        const person = wikiPayload?.person || null;
        const candidates = wikiPayload?.candidates || [];
        const isDisambiguation = Boolean(wikiPayload?.isDisambiguation);

        if (isDisambiguation) {
            const responsePayload = createEmptyResponse(query, person, candidates);
            setCached(cacheKey, responsePayload);
            return res.json(responsePayload);
        }

        const [newsResult, rssResult, youtubeResult] = await Promise.allSettled([
            fetchNews(query),
            fetchRssNews(person?.name || query, person?.aliases || []),
            fetchYouTubeVideos(query),
        ]);

        const newsPayload = newsResult.status === 'fulfilled' ? newsResult.value : { articles: [], warning: null };
        const rssArticles = rssResult.status === 'fulfilled' ? rssResult.value : [];
        const youtubePayload = youtubeResult.status === 'fulfilled'
            ? youtubeResult.value
            : { videos: [], warning: 'YouTube request failed' };

        const combined = dedupeArticles([...(newsPayload?.articles || []), ...rssArticles]);
        const filtered = filterRelevant(combined, query, person?.name, person?.aliases || []);
        const timeline = sortByDate(filtered);
        const combinedText = buildInsightText(timeline);

        const gnewsStatus = buildSourceStatus(newsResult, newsPayload?.warning);
        const rssStatus = buildSourceStatus(rssResult);
        const youtubeStatus = buildSourceStatus(youtubeResult, youtubePayload?.warning);

        const warnings = collectWarnings(
            gnewsStatus, rssStatus, youtubeStatus,
            { warning: newsPayload?.warning },
            { warning: youtubePayload?.warning }
        );

        const responsePayload = {
            query,
            person,
            candidates,
            isDisambiguation,
            recentActivities: buildRecentActivities(timeline),
            recentLocations: extractLocationsFromArticles(timeline),
            news: timeline,
            events: buildEventGroups(timeline),
            videos: youtubePayload?.videos || [],
            insights: {
                topics: extractTopics(combinedText),
                quotes: extractQuotes(combinedText),
                locations: extractLocations(combinedText),
            },
            metadata: {
                newsProvider: 'gnews+rss',
                warning: warnings.length ? [...new Set(warnings)].join(' | ') : null,
                sources: { gnews: gnewsStatus, rss: rssStatus, youtube: youtubeStatus },
            },
        };

        setCached(cacheKey, responsePayload);
        res.json(responsePayload);
    } catch (err) {
        next(err);
    }
};
