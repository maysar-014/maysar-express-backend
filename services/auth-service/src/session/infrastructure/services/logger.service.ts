import { ServiceLogger, LogContext } from '../../../../../../shared/logger/logger';

export enum LogLevel {
    ERROR = 'error',
    WARN = 'warn',
    INFO = 'info',
    DEBUG = 'debug'
}

export class Logger {
    private delegate: ServiceLogger;

    constructor() {
        this.delegate = new ServiceLogger('SessionService', 'session-service');
    }

    error(message: string, meta?: LogContext & Record<string, any>): void {
        this.delegate.error(message, meta);
    }

    warn(message: string, meta?: LogContext & Record<string, any>): void {
        this.delegate.warn(message, meta);
    }

    info(message: string, meta?: LogContext & Record<string, any>): void {
        this.delegate.info(message, meta);
    }

    debug(message: string, meta?: LogContext & Record<string, any>): void {
        this.delegate.debug(message, meta);
    }

    logRequest(method: string, url: string, statusCode: number, duration: number, userId?: string): void {
        const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
        this.delegate[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'info']('HTTP Request', {
            method, url, statusCode, duration: `${duration}ms`, userId
        });
    }
}

export const logger = new Logger();
