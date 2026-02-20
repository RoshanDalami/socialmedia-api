const buckets = new Map();

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_REQUESTS = 60;

const pruneExpiredBuckets = (now, windowMs) => {
    for (const [key, bucket] of buckets.entries()) {
        if (now - bucket.start > windowMs) {
            buckets.delete(key);
        }
    }
};

const rateLimiter = ({ windowMs = DEFAULT_WINDOW_MS, max = DEFAULT_MAX_REQUESTS } = {}) => {
    return (req, res, next) => {
        const now = Date.now();
        pruneExpiredBuckets(now, windowMs);

        const key = `${req.ip}:${req.path}`;
        const bucket = buckets.get(key) || { count: 0, start: now };

        if (now - bucket.start > windowMs) {
            bucket.count = 0;
            bucket.start = now;
        }

        bucket.count += 1;
        buckets.set(key, bucket);

        if (bucket.count > max) {
            return res.status(429).json({
                error: 'Too many requests',
                retryAfter: Math.ceil((bucket.start + windowMs - now) / 1000),
            });
        }

        next();
    };
};

export default rateLimiter;
