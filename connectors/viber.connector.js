const viberConnector = {
    id: 'viber',
    displayName: 'Viber Bot Channels',
    enabledByDefault: false,
    capabilities: {
        realtime: true,
        search: false,
        limits: 'Bot-only channels; no global search.',
    },
    async run() {
        throw new Error('Viber bot ingestion not configured');
    },
};

export default viberConnector;
