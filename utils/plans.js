export const PLAN_LIMITS = Object.freeze({
    individual: {
        keywords: 3,
        mentionsPerMonth: 3000,
        minIntervalMinutes: 30,
    },
    team: {
        keywords: 7,
        mentionsPerMonth: 20000,
        minIntervalMinutes: 10,
    },
    pro: {
        keywords: 15,
        mentionsPerMonth: 100000,
        minIntervalMinutes: 5,
    },
});

export const DEFAULT_PLAN = 'individual';

export const getPlanLimits = (planName) =>
    PLAN_LIMITS[planName] || PLAN_LIMITS[DEFAULT_PLAN];
