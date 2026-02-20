export const getMonthKey = (date = new Date()) => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
};

export const isValidDate = (value) => {
    const date = new Date(value);
    return !Number.isNaN(date.getTime());
};

export const formatISODate = (date = new Date()) => date.toISOString();
