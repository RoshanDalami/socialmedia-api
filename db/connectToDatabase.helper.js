import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { DB_NAME } from './constants.js';

const MONGODB_OPTIONS = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
};

const connectToDB = async () => {
    const mongoUrl = process.env.MONGODB_URL;
    if (!mongoUrl) {
        throw new Error('MONGODB_URL environment variable is not defined');
    }

    try {
        const conn = await mongoose.connect(`${mongoUrl}/${DB_NAME}`, MONGODB_OPTIONS);
        console.log(`Database connected: ${conn.connection.host}`);
        return conn;
    } catch (err) {
        console.error('Database connection failed:', err.message);
        process.exit(1);
    }
};

mongoose.connection.on('disconnected', () => {
    console.warn('Database connection lost');
});

mongoose.connection.on('reconnected', () => {
    console.log('Database reconnected');
});

const isDirectRun = fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
    connectToDB();
}

export default connectToDB;
