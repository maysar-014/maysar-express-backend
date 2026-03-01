import winston from 'winston';

export enum LogLevel {
    ERROR = 'error',
    WARN = 'warn',
    INFO = 'info',
    DEBUG = 'debug'
}

export class Logger {
    private logger: winston.Logger;

    constructor() {
        this.logger = winston.createLogger({
            level: process.env.LOG_LEVEL || 'info',
            format: winston.format.combine(
                winston.format.timestamp({
                    format: 'YYYY-MM-DD HH:mm:ss'
                }),
                winston.format.errors({ stack: true }),
                winston.format.json()
            ),
            defaultMeta: {
                service: 'maps-service',
                version: process.env.npm_package_version || '1.0.0'
            },
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.simple()
                    )
                }),
                ...(process.env.NODE_ENV === 'production' ? [
                    new winston.transports.File({
                        filename: 'logs/error.log',
                        level: 'error',
                        maxsize: 5242880,
                        maxFiles: 5
                    }),
                    new winston.transports.File({
                        filename: 'logs/combined.log',
                        maxsize: 5242880,
                        maxFiles: 5
                    })
                ] : [])
            ]
        });
    }

    error(message: string, meta?: Record<string, any>): void {
        this.logger.error(message, meta);
    }

    warn(message: string, meta?: Record<string, any>): void {
        this.logger.warn(message, meta);
    }

    info(message: string, meta?: Record<string, any>): void {
        this.logger.info(message, meta);
    }

    debug(message: string, meta?: Record<string, any>): void {
        this.logger.debug(message, meta);
    }

    /** legacy support */
    log(level: string, message: string, meta?: Record<string, any>): void {
        if (level === 'error') this.error(message, meta);
        else if (level === 'warn') this.warn(message, meta);
        else this.info(message, meta);
    }

    logPerformance(operation: string, duration: number, metadata?: Record<string, any>): void {
        this.logger.info('Performance', { operation, duration: `${duration}ms`, ...metadata });
    }

    logRequest(method: string, url: string, statusCode: number, duration: number, userId?: string): void {
        const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
        this.logger.log(level, 'HTTP Request', {
            method,
            url,
            statusCode,
            duration: `${duration}ms`,
            userId
        });
    }
}

export const logger = new Logger();
