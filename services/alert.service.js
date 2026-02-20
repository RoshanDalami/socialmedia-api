import { Alert } from '../model/alert.model.js';
import { Mention } from '../model/mention.model.js';
import { getSocket } from './socket.service.js';
import { sendEmail, sendAlertEmail } from './email.service.js';
import { User } from '../model/user.model.js';

// Time constants
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

// Default thresholds (can be overridden per-user/project)
const DEFAULT_THRESHOLDS = {
    volumeSpike: {
        minMentions: 5,           // Minimum mentions to trigger
        multiplier: 2,            // X times the average
        windowHours: 1,           // Time window to check
        compareWindowHours: 24,   // Compare against this period
    },
    sentimentShift: {
        minMentions: 10,          // Minimum mentions to analyze
        negativeThreshold: 30,    // % negative mentions to alert
        shiftThreshold: 20,       // % change in sentiment to alert
        windowHours: 6,           // Time window to check
    },
    reachSpike: {
        minReach: 10000,          // Minimum reach to trigger
        multiplier: 3,            // X times the average daily reach
    },
    influencerMention: {
        minFollowers: 50000,      // Minimum author followers to count as influencer
    },
    keywordAlert: {
        cooldownMinutes: 30,      // Don't re-alert for same keyword within this time
    },
};

/**
 * Emit alert via websocket to user and project rooms
 */
const notifyRealtime = (alert) => {
    const io = getSocket();
    if (!io) return;

    const userRoom = alert.userId ? `user:${alert.userId}` : '';
    const projectRoom = alert.projectId ? `project:${alert.projectId}` : '';

    if (userRoom && projectRoom) {
        // Emit once to the union of rooms to avoid duplicate deliveries.
        io.to(userRoom).to(projectRoom).emit('alert', alert);
        return;
    }
    if (userRoom) {
        io.to(userRoom).emit('alert', alert);
        return;
    }
    if (projectRoom) {
        io.to(projectRoom).emit('alert', alert);
    }
};

/**
 * Check if email alerts are enabled
 */
const shouldSendEmail = () => process.env.ALERT_EMAIL_ENABLED === 'true';

/**
 * Send email notification for an alert
 */
const maybeEmail = async (userId, alert, mentions = []) => {
    if (!shouldSendEmail()) return;
    
    try {
        const user = await User.findById(userId).select('email fullName alertPreferences');
        if (!user?.email) return;
        
        // Check user preferences (if they exist)
        if (user.alertPreferences?.emailEnabled === false) return;
        
        await sendAlertEmail(user.email, alert, mentions, user.fullName);
    } catch (error) {
        console.error('[Alert] Failed to send email:', error.message);
    }
};

/**
 * Create and store an alert, then notify via websocket and email
 */
export const createAlert = async ({ user, project, type, message, payload = {}, triggerMentions = [] }) => {
    const userId = user._id || user;
    const projectId = project._id || project;
    
    // Check for duplicate recent alerts (prevent spam)
    const recentSimilar = await Alert.findOne({
        userId,
        projectId,
        type,
        createdAt: { $gte: new Date(Date.now() - 30 * MINUTE_MS) },
    });
    
    if (recentSimilar) {
        console.log(`[Alert] Skipping duplicate ${type} alert for project ${projectId}`);
        return null;
    }

    const alert = await Alert.create({
        userId,
        projectId,
        type,
        message,
        payload,
    });

    notifyRealtime(alert);
    await maybeEmail(userId, alert, triggerMentions);
    return alert;
};

/**
 * Check for volume spike - sudden increase in mentions
 */
export const checkForVolumeSpike = async ({ project, user, thresholds = {} }) => {
    const config = { ...DEFAULT_THRESHOLDS.volumeSpike, ...thresholds };
    const now = new Date();
    const windowStart = new Date(now.getTime() - config.windowHours * HOUR_MS);
    const compareStart = new Date(now.getTime() - config.compareWindowHours * HOUR_MS);

    const [recentCount, compareCount, recentMentions] = await Promise.all([
        Mention.countDocuments({ 
            projectId: project._id, 
            createdAt: { $gte: windowStart } 
        }),
        Mention.countDocuments({ 
            projectId: project._id, 
            createdAt: { $gte: compareStart, $lt: windowStart } 
        }),
        Mention.find({ 
            projectId: project._id, 
            createdAt: { $gte: windowStart } 
        }).limit(10).sort({ createdAt: -1 }),
    ]);

    const avgHourly = compareCount / (config.compareWindowHours - config.windowHours) || 0;
    const expectedCount = avgHourly * config.windowHours;
    const threshold = Math.max(config.minMentions, expectedCount * config.multiplier);

    if (recentCount >= threshold) {
        const percentIncrease = expectedCount > 0 
            ? Math.round(((recentCount - expectedCount) / expectedCount) * 100) 
            : 100;
            
        await createAlert({
            user,
            project,
            type: 'volume_spike',
            message: `🚨 Volume spike detected: ${recentCount} mentions in the last ${config.windowHours} hour(s) (${percentIncrease}% above average)`,
            payload: { 
                recentCount, 
                avgHourly: Math.round(avgHourly * 100) / 100, 
                threshold: Math.round(threshold),
                percentIncrease,
                windowHours: config.windowHours,
            },
            triggerMentions: recentMentions,
        });
        return true;
    }
    return false;
};

/**
 * Check for sentiment shift - sudden change in sentiment distribution
 */
export const checkForSentimentShift = async ({ project, user, thresholds = {} }) => {
    const config = { ...DEFAULT_THRESHOLDS.sentimentShift, ...thresholds };
    const now = new Date();
    const windowStart = new Date(now.getTime() - config.windowHours * HOUR_MS);
    const previousWindowStart = new Date(windowStart.getTime() - config.windowHours * HOUR_MS);

    // Get mentions from current and previous windows
    const [currentMentions, previousMentions] = await Promise.all([
        Mention.find({ 
            projectId: project._id, 
            createdAt: { $gte: windowStart },
            'sentiment.label': { $exists: true },
        }).select('sentiment title snippet source'),
        Mention.find({ 
            projectId: project._id, 
            createdAt: { $gte: previousWindowStart, $lt: windowStart },
            'sentiment.label': { $exists: true },
        }).select('sentiment'),
    ]);

    if (currentMentions.length < config.minMentions) return false;

    // Calculate sentiment distribution
    const calcSentiment = (mentions) => {
        const total = mentions.length || 1;
        let positive = 0, negative = 0, neutral = 0;
        
        mentions.forEach(m => {
            const label = (m.sentiment?.label || '').toLowerCase();
            if (label.includes('positive') || label.includes('4') || label.includes('5')) positive++;
            else if (label.includes('negative') || label.includes('1') || label.includes('2')) negative++;
            else neutral++;
        });
        
        return {
            positive: (positive / total) * 100,
            negative: (negative / total) * 100,
            neutral: (neutral / total) * 100,
            total,
        };
    };

    const current = calcSentiment(currentMentions);
    const previous = calcSentiment(previousMentions);

    // Check for high negative percentage
    if (current.negative >= config.negativeThreshold) {
        const negativeMentions = currentMentions.filter(m => {
            const label = (m.sentiment?.label || '').toLowerCase();
            return label.includes('negative') || label.includes('1') || label.includes('2');
        });
        
        await createAlert({
            user,
            project,
            type: 'sentiment_negative',
            message: `😟 High negative sentiment: ${Math.round(current.negative)}% of recent mentions are negative`,
            payload: {
                current,
                previous,
                windowHours: config.windowHours,
                mentionCount: currentMentions.length,
            },
            triggerMentions: negativeMentions.slice(0, 10),
        });
        return true;
    }

    // Check for significant sentiment shift
    const negativeShift = current.negative - (previous.negative || 0);
    if (previous.total >= config.minMentions && negativeShift >= config.shiftThreshold) {
        const negativeMentions = currentMentions.filter(m => {
            const label = (m.sentiment?.label || '').toLowerCase();
            return label.includes('negative') || label.includes('1') || label.includes('2');
        });
        
        await createAlert({
            user,
            project,
            type: 'sentiment_shift',
            message: `📉 Sentiment shift detected: Negative mentions increased by ${Math.round(negativeShift)}% compared to previous period`,
            payload: {
                current,
                previous,
                shift: Math.round(negativeShift),
                windowHours: config.windowHours,
            },
            triggerMentions: negativeMentions.slice(0, 10),
        });
        return true;
    }

    return false;
};

/**
 * Check for reach spike - sudden increase in estimated reach
 */
export const checkForReachSpike = async ({ project, user, thresholds = {} }) => {
    const config = { ...DEFAULT_THRESHOLDS.reachSpike, ...thresholds };
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const weekAgo = new Date(todayStart.getTime() - 7 * DAY_MS);

    const [todayMentions, weekMentions] = await Promise.all([
        Mention.aggregate([
            { $match: { projectId: project._id, createdAt: { $gte: todayStart } } },
            { $group: { _id: null, totalReach: { $sum: '$reachEstimate' } } },
        ]),
        Mention.aggregate([
            { $match: { projectId: project._id, createdAt: { $gte: weekAgo, $lt: todayStart } } },
            { $group: { _id: null, totalReach: { $sum: '$reachEstimate' } } },
        ]),
    ]);

    const todayReach = todayMentions[0]?.totalReach || 0;
    const avgDailyReach = (weekMentions[0]?.totalReach || 0) / 7;
    const threshold = Math.max(config.minReach, avgDailyReach * config.multiplier);

    if (todayReach >= threshold) {
        await createAlert({
            user,
            project,
            type: 'reach_spike',
            message: `📈 Reach spike: Today's estimated reach is ${todayReach.toLocaleString()} (${Math.round(todayReach / avgDailyReach)}x average)`,
            payload: {
                todayReach,
                avgDailyReach: Math.round(avgDailyReach),
                multiplier: Math.round((todayReach / avgDailyReach) * 10) / 10,
            },
        });
        return true;
    }
    return false;
};

/**
 * Check for influencer mentions - high-follower accounts mentioning the project keywords
 */
export const checkForInfluencerMention = async ({ project, user, mention, thresholds = {} }) => {
    const config = { ...DEFAULT_THRESHOLDS.influencerMention, ...thresholds };
    
    const followers = mention.authorFollowers || mention.author?.followers || 0;
    
    if (followers >= config.minFollowers) {
        await createAlert({
            user,
            project,
            type: 'influencer_mention',
            message: `⭐ Influencer mention: @${mention.author || 'Unknown'} (${followers.toLocaleString()} followers) mentioned your keywords`,
            payload: {
                author: mention.author,
                followers,
                source: mention.source,
                mentionId: mention._id,
                url: mention.url,
            },
            triggerMentions: [mention],
        });
        return true;
    }
    return false;
};

/**
 * Run all checks for a project (called periodically or after ingestion)
 */
export const runAllChecks = async ({ project, user }) => {
    const results = {
        volumeSpike: false,
        sentimentShift: false,
        reachSpike: false,
    };

    try {
        results.volumeSpike = await checkForVolumeSpike({ project, user });
        results.sentimentShift = await checkForSentimentShift({ project, user });
        results.reachSpike = await checkForReachSpike({ project, user });
    } catch (error) {
        console.error('[Alert] Error running checks:', error.message);
    }

    return results;
};

/**
 * Get alert statistics for a user
 */
export const getAlertStats = async (userId) => {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - DAY_MS);
    const weekAgo = new Date(now.getTime() - 7 * DAY_MS);

    const [today, thisWeek, unread, byType] = await Promise.all([
        Alert.countDocuments({ userId, createdAt: { $gte: dayAgo } }),
        Alert.countDocuments({ userId, createdAt: { $gte: weekAgo } }),
        Alert.countDocuments({ userId, readAt: null }),
        Alert.aggregate([
            { $match: { userId, createdAt: { $gte: weekAgo } } },
            { $group: { _id: '$type', count: { $sum: 1 } } },
        ]),
    ]);

    return {
        today,
        thisWeek,
        unread,
        byType: Object.fromEntries(byType.map(b => [b._id, b.count])),
    };
};

// Legacy export for backward compatibility
export const checkForSpike = checkForVolumeSpike;
