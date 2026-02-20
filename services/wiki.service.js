import fetch from 'node-fetch';

const WIKI_SEARCH_URL = 'https://en.wikipedia.org/w/rest.php/v1/search/title';
const WIKI_SUMMARY_URL = 'https://en.wikipedia.org/api/rest_v1/page/summary/';
const DEFAULT_LIMIT = 5;

const normalizeTitle = (title) => encodeURIComponent(title.replace(/ /g, '_'));
const getPageUrl = (title) => `https://en.wikipedia.org/wiki/${normalizeTitle(title)}`;

const mapCandidate = (page) => ({
    title: page?.title || '',
    description: page?.description || '',
    thumbnail: page?.thumbnail?.url || '',
    wikipediaUrl: page?.content_urls?.desktop?.page || getPageUrl(page?.title || ''),
});

const isDisambiguationPage = (summaryData) => {
    const type = summaryData?.type || '';
    const description = summaryData?.description || '';
    const extract = summaryData?.extract || '';

    return (
        type === 'disambiguation' ||
        description.toLowerCase().includes('disambiguation') ||
        extract.toLowerCase().includes('may refer to')
    );
};

export const fetchWikiProfile = async (query, limit = DEFAULT_LIMIT) => {
    const resolvedLimit = Number(process.env.WIKI_LIMIT) || limit;
    const searchUrl = `${WIKI_SEARCH_URL}?q=${encodeURIComponent(query)}&limit=${resolvedLimit}`;

    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) {
        throw new Error('Failed to search Wikipedia');
    }

    const searchData = await searchResponse.json();
    const pages = Array.isArray(searchData?.pages) ? searchData.pages : [];
    const bestMatch = pages[0];
    const candidates = pages.map(mapCandidate);

    if (!bestMatch?.title) {
        return { person: null, candidates: [] };
    }

    const summaryUrl = `${WIKI_SUMMARY_URL}${normalizeTitle(bestMatch.title)}`;
    const summaryResponse = await fetch(summaryUrl);

    if (!summaryResponse.ok) {
        return {
            person: {
                name: bestMatch.title,
                description: bestMatch.description || '',
                wikipediaUrl: bestMatch?.content_urls?.desktop?.page || '',
                thumbnail: bestMatch?.thumbnail?.url || '',
                extract: '',
                pageId: null,
            },
            candidates,
            isDisambiguation: false,
        };
    }

    const summaryData = await summaryResponse.json();
    const description = summaryData?.description || bestMatch.description || '';
    const extract = summaryData?.extract || '';

    return {
        person: {
            name: summaryData?.title || bestMatch.title,
            description,
            wikipediaUrl: summaryData?.content_urls?.desktop?.page || '',
            thumbnail: summaryData?.thumbnail?.source || '',
            extract,
            pageId: summaryData?.pageid || null,
            aliases: summaryData?.titles
                ? [summaryData.titles.normalized, summaryData.titles.canonical].filter(Boolean)
                : [],
        },
        candidates,
        isDisambiguation: isDisambiguationPage(summaryData),
    };
};
