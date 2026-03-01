/**
 * Shared Logger Infrastructure
 * Canonical structured logging with Winston for all services
 */

import winston from 'winston';

// ============================================================================
// LOG CONTEXT
// ============================================================================

export interface LogContext {
    requestId?: string;
    correlationId?: string;
    sagaId?: string;
    eventId?: string;
    executionTime?: number;
}

// ============================================================================
// WINSTON LOGGER FACTORY
// ============================================================================

export function createServiceLogger(serviceName: string): winston.Logger {
    const isDev = process.env.NODE_ENV !== 'production';
    const logLevel = process.env.LOG_LEVEL || 'info';

    const transportsArray: winston.transport[] = [
        new winston.transports.Console({
            level: logLevel,
            format: isDev
                ? winston.format.combine(
                    winston.format.colorize(),
                    winston.format.simple(),
                    winston.format.printf(({ timestamp, level, message, ...meta }) => {
                        const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
                        return `${timestamp} ${level}: ${message} ${metaStr}`;
                    })
                )
                : winston.format.combine(
                    winston.format.uncolorize(),
                    winston.format.json()
                ),
        }),
    ];

    if (!isDev) {
        transportsArray.push(
            new winston.transports.File({
                filename: `logs/${serviceName}.log`,
                level: logLevel,
                format: winston.format.combine(
                    winston.format.uncolorize(),
                    winston.format.json()
                ),
                maxsize: 5242880, // 5MB
                maxFiles: 30,
            }),
            new winston.transports.File({
                filename: `logs/${serviceName}-error.log`,
                level: 'error',
                format: winston.format.combine(
                    winston.format.uncolorize(),
                    winston.format.json()
                ),
                maxsize: 5242880,
                maxFiles: 30,
            })
        );
    }

    return winston.createLogger({
        level: logLevel,
        format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.errors({ stack: true }),
            winston.format.json()
        ),
        defaultMeta: { service: serviceName },
        transports: transportsArray,
        exitOnError: false,
    });
}

// ============================================================================
// SERVICE LOGGER CLASS
// ============================================================================

export class ServiceLogger {
    private winstonLogger: winston.Logger;

    constructor(
        private readonly context: string,
        private readonly serviceName: string
    ) {
        this.winstonLogger = createServiceLogger(serviceName);
    }

    private formatMessage(message: string, meta?: LogContext & Record<string, any>): Record<string, any> {
        return {
            message,
            context: this.context,
            service: this.serviceName,
            timestamp: new Date().toISOString(),
            requestId: meta?.requestId,
            correlationId: meta?.correlationId,
            sagaId: meta?.sagaId,
            eventId: meta?.eventId,
            executionTime: meta?.executionTime,
            ...meta,
        };
    }

    error(message: string, errorOrMeta?: any, meta?: LogContext & Record<string, any>): void {
        let actualError: any = undefined;
        let actualMeta: any = meta || {};

        if (errorOrMeta instanceof Error) {
            actualError = { name: errorOrMeta.name, message: errorOrMeta.message, stack: errorOrMeta.stack };
        } else if (errorOrMeta && typeof errorOrMeta === 'object') {
            // If second arg is an object but not an Error, treat it as metadata
            actualMeta = { ...errorOrMeta, ...actualMeta };
        } else {
            actualError = errorOrMeta;
        }

        const logData = this.formatMessage(message, {
            ...actualMeta,
            error: actualError
        });
        this.winstonLogger.error(message, logData);
    }

    warn(message: string, meta?: LogContext & Record<string, any>): void {
        this.winstonLogger.warn(message, this.formatMessage(message, meta));
    }

    info(message: string, meta?: LogContext & Record<string, any>): void {
        this.winstonLogger.info(message, this.formatMessage(message, meta));
    }

    debug(message: string, meta?: LogContext & Record<string, any>): void {
        this.winstonLogger.debug(message, this.formatMessage(message, meta));
    }

    // Business-specific logging methods

    audit(action: string, userId: string, resource: string, details?: LogContext & Record<string, any>): void {
        this.info(`AUDIT: ${action}`, {
            audit: { action, userId, resource, timestamp: new Date().toISOString(), ...details },
            ...details,
        });
    }

    performance(operation: string, duration: number, meta?: LogContext & Record<string, any>): void {
        this.info(`PERFORMANCE: ${operation}`, {
            performance: { operation, duration, unit: 'ms', ...meta },
            ...meta,
        });
    }

    security(event: string, severity: 'low' | 'medium' | 'high' | 'critical', details?: LogContext & Record<string, any>): void {
        const level: 'error' | 'warn' | 'info' =
            severity === 'critical' || severity === 'high' ? 'error' :
                severity === 'medium' ? 'warn' : 'info';
        this[level](`SECURITY: ${event}`, {
            security: { event, severity, timestamp: new Date().toISOString(), ...details },
            ...details,
        });
    }

    api(method: string, path: string, statusCode: number, duration: number, userId?: string): void {
        const level: 'error' | 'warn' | 'info' =
            statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
        this[level](`API: ${method} ${path}`, {
            api: { method, path, statusCode, duration, userId, timestamp: new Date().toISOString() },
        });
    }

    database(operation: string, table: string, duration: number, success: boolean, error?: any): void {
        const level: 'debug' | 'error' = success ? 'debug' : 'error';
        this[level](`DATABASE: ${operation}`, {
            database: { operation, table, duration, success, error: error?.message, timestamp: new Date().toISOString() },
        });
    }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createLogger(context: string, serviceName: string): ServiceLogger {
    return new ServiceLogger(context, serviceName);
}

export const appLogger = createLogger('application', 'core');
