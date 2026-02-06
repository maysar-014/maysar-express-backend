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
                service: 'wallet-service',
                version: process.env.npm_package_version || '1.0.0'
            },
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.simple()
                    )
                })
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

    logPerformance(operation: string, duration: number, metadata?: Record<string, any>): void {
        this.logger.info('Performance Metric', {
            operation,
            duration: `${duration}ms`,
            ...metadata
        });
    }
}

export const logger = new Logger();
