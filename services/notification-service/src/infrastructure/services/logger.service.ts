import { ServiceLogger, LogContext } from '../../../../../shared/logger/logger';

export class Logger {
    private delegate: ServiceLogger;

    constructor() {
        this.delegate = new ServiceLogger('NotificationService', 'notification-service');
    }

    error(msg: string, meta?: LogContext & Record<string, any>) { this.delegate.error(msg, meta); }
    warn(msg: string, meta?: LogContext & Record<string, any>) { this.delegate.warn(msg, meta); }
    info(msg: string, meta?: LogContext & Record<string, any>) { this.delegate.info(msg, meta); }
    debug(msg: string, meta?: LogContext & Record<string, any>) { this.delegate.debug(msg, meta); }

    /** legacy support */
    log(level: string, msg: string, meta?: any) {
        if (level === 'error') this.error(msg, meta);
        else if (level === 'warn') this.warn(msg, meta);
        else this.info(msg, meta);
    }

    logRequest(req: any, res: any, duration: number) {
        this.delegate.info(`API: ${req.method} ${req.url}`, {
            requestId: req.requestId || req.get('X-Request-ID'),
            correlationId: req.correlationId || req.get('X-Correlation-ID'),
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            executionTime: duration
        });
    }

    logPerformance(operation: string, duration: number, metadata?: Record<string, any>) {
        this.delegate.performance(operation, duration, metadata);
    }
}

export const logger = new Logger();
