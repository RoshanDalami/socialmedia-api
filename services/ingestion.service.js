import { connectors } from '../connectors/index.js';
import { Project } from '../model/project.model.js';
import { Mention } from '../model/mention.model.js';
import { ConnectorHealth } from '../model/connectorHealth.model.js';
import { Usage } from '../model/usage.model.js';
import { User } from '../model/user.model.js';
import { AuditLog } from '../model/auditLog.model.js';
import { evaluateBooleanQuery, sanitizeQuery } from '../utils/booleanQuery.js';
import { createSimilarityHash } from '../utils/hash.js';
import { detectLanguage, inferSentiment } from './sentiment.service.js';
import { getPlanLimits } from '../utils/plans.js';
import { getMonthKey } from '../utils/date.js';
import { createAlert, checkForSpike } from './alert.service.js';

const CONNECTOR_TIMEOUT_MS = 25_000;
const SCHEDULER_INTERVAL_MS = 60_000;
const REACH_MULTIPLIERS = Object.freeze({
    youtube: 10,
    reddit: 5,
});
const DEFAULT_ENGAGEMENT = Object.freeze({ likes: 0, comments: 0, shares: 0 });

const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));
const withTimeout = (promise, ms) => Promise.race([promise, timeout(ms)]);

const getEnabledConnectors = (project) =>
    connectors.filter((connector) => project.sources?.[connector.id] ?? connector.enabledByDefault);

const matchKeywords = (project, text) => {
    const haystack = text.toLowerCase();
    const keywords = (project.keywords || []).map((k) => k.toLowerCase());
    const matchedKeyword = keywords.find((keyword) => haystack.includes(keyword)) || '';
    const sanitized = sanitizeQuery(project.booleanQuery || '');
    const booleanMatch = sanitized ? evaluateBooleanQuery(sanitized, haystack) : true;
    return { matchedKeyword, booleanMatch };
};

const estimateReach = (mention) => {
    if (mention.followerCount) return mention.followerCount;

    const multiplier = REACH_MULTIPLIERS[mention.source];
    if (multiplier) {
        const metric = mention.source === 'youtube'
            ? mention.engagement?.likes || 0
            : mention.engagement?.comments || 0;
        return metric * multiplier;
    }

    return 0;
};

const upsertConnectorHealth = async (projectId, connectorId, status, err = null) => {
    await ConnectorHealth.findOneAndUpdate(
        { projectId, connectorId },
        {
            status,
            lastError: err ? String(err.message || err) : '',
            lastCheckedAt: new Date(),
        },
        { upsert: true, new: true }
    );
};

const logConnectorError = async (project, connectorId, err) => {
    await AuditLog.create({
        userId: project.userId,
        projectId: project._id,
        connectorId,
        level: 'error',
        message: String(err.message || err),
    });
};

const ensureUsage = async (userId) => {
    return Usage.findOneAndUpdate(
        { userId, month: getMonthKey() },
        { $setOnInsert: { mentionsCount: 0 } },
        { upsert: true, new: true }
    );
};

const isOverLimit = (user, usage) => {
    const limits = getPlanLimits(user.plan);
    return usage.mentionsCount >= limits.mentionsPerMonth;
};

const runConnector = async (connector, project) => {
    const result = await withTimeout(
        connector.run({ project, from: project.lastRunAt, to: new Date() }),
        CONNECTOR_TIMEOUT_MS
    );
    return Array.isArray(result) ? result : [];
};

const prepareMention = async (raw, project, matchedKeyword, runAt) => {
    const text = `${raw.title || ''} ${raw.text || ''}`.trim();

    return {
        projectId: project._id,
        source: raw.source,
        keywordMatched: matchedKeyword,
        title: raw.title || '',
        text: raw.text || '',
        author: raw.author || '',
        url: raw.url || null,
        publishedAt: raw.publishedAt ? new Date(raw.publishedAt) : null,
        engagement: raw.engagement || DEFAULT_ENGAGEMENT,
        followerCount: raw.followerCount || 0,
        reachEstimate: estimateReach(raw),
        lang: detectLanguage(text),
        geo: project.geoFocus || '',
        sentiment: await inferSentiment(text),
        similarityHash: createSimilarityHash(`${raw.title} ${raw.text}`) || null,
        ingestedAt: runAt,
    };
};

const insertMentions = async (prepared) => {
    if (!prepared.length) return 0;

    try {
        const docs = await Mention.insertMany(prepared, { ordered: false });
        return docs.length;
    } catch (err) {
        if (err?.writeErrors) {
            return prepared.length - err.writeErrors.length;
        }
        throw err;
    }
};

const isDue = (project) => {
    const lastRun = project.lastRunAt ? new Date(project.lastRunAt).getTime() : 0;
    return Date.now() - lastRun >= project.scheduleMinutes * 60 * 1000;
};

export const ingestProject = async (project, options = {}) => {
    const { force = false } = options;
    if (project.status !== 'active' && !force) return { inserted: 0, status: project.status };

    const runAt = new Date();
    const user = await User.findById(project.userId);
    const usage = await ensureUsage(project.userId);

    if (!user || isOverLimit(user, usage)) {
        return { inserted: 0, reason: 'limit' };
    }

    const enabledConnectors = getEnabledConnectors(project);
    let inserted = 0;

    for (const connector of enabledConnectors) {
        try {
            const rawMentions = await runConnector(connector, project);

            const prepared = [];
            for (const raw of rawMentions) {
                const text = `${raw.title || ''} ${raw.text || ''}`.trim();
                const { matchedKeyword, booleanMatch } = matchKeywords(project, text);

                if (!booleanMatch || (!matchedKeyword && project.keywords?.length)) {
                    continue;
                }

                prepared.push(await prepareMention(raw, project, matchedKeyword, runAt));
            }

            const healthStatus = prepared.length > 0 ? 'ok' : 'no_data';
            await upsertConnectorHealth(project._id, connector.id, healthStatus);

            inserted += await insertMentions(prepared);
        } catch (err) {
            await upsertConnectorHealth(project._id, connector.id, 'degraded', err);
            await logConnectorError(project, connector.id, err);
        }
    }

    if (inserted > 0) {
        await Usage.findOneAndUpdate(
            { userId: project.userId, month: getMonthKey() },
            { $inc: { mentionsCount: inserted } }
        );
        await createAlert({
            user,
            project,
            type: 'new_mentions',
            message: `${inserted} new mentions for ${project.name}.`,
            payload: { count: inserted },
        });
        await checkForSpike({ project, user });
    }

    project.lastRunAt = runAt;
    if (options.autoPause) {
        project.status = 'paused';
    }
    await project.save({ validateBeforeSave: false });

    return { inserted, status: project.status };
};

export const startIngestionScheduler = () => {
    setInterval(async () => {
        const projects = await Project.find({ status: 'active' });

        for (const project of projects) {
            if (isDue(project)) {
                await ingestProject(project, { autoPause: true });
            }
        }
    }, SCHEDULER_INTERVAL_MS);
};
