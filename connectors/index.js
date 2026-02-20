import localNewsConnector from './localNews.connector.js';
import youtubeConnector from './youtube.connector.js';
import redditConnector from './reddit.connector.js';
import xConnector from './x.connector.js';
import metaConnector from './meta.connector.js';
import tiktokConnector from './tiktok.connector.js';
import viberConnector from './viber.connector.js';

export const connectors = [
    localNewsConnector,
    youtubeConnector,
    redditConnector,
    xConnector,
    metaConnector,
    tiktokConnector,
    viberConnector,
];

export const getConnectorById = (id) => connectors.find((connector) => connector.id === id);
