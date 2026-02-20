const tiktokConnector = {
    id: 'tiktok',
    displayName: 'TikTok (Experimental)',
    enabledByDefault: false,
    capabilities: {
        realtime: false,
        search: true,
        limits: 'Experimental scraping; best-effort only.',
    },
    async run() {
        throw new Error('TikTok scraping not implemented');
    },
};

export default tiktokConnector;
