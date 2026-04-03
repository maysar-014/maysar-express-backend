import winston from 'winston';
import { createSafeFileTransports } from '../../shared/logger/file-transports';

const isDev = process.env.NODE_ENV !== 'production';

const consoleTransport = new winston.transports.Console({
    format: isDev
        ? winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
        : winston.format.combine(
            winston.format.uncolorize(),
            winston.format.json()
        ),
});

export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    defaultMeta: { service: 'maysar-monolith' },
    transports: [
        consoleTransport,
        ...createSafeFileTransports([
            { filename: 'error.log', level: 'error' },
            { filename: 'combined.log' },
        ]),
    ],
});
