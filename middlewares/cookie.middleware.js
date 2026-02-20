const parseCookieHeader = (header = '') =>
    header.split(';').reduce((acc, part) => {
        const [rawKey, ...rest] = part.split('=');
        const key = rawKey?.trim();
        if (!key) return acc;
        acc[key] = decodeURIComponent(rest.join('=').trim());
        return acc;
    }, {});

const cookieParser = (req, _res, next) => {
    req.cookies = parseCookieHeader(req.headers?.cookie || '');
    next();
};

export default cookieParser;
