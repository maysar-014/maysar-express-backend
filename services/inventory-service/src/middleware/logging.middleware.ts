import { Request, Response, NextFunction } from 'express';
import { logger } from '../infrastructure/services/logger.service';

/**
 * Request tracing middleware
 * Adds request ID and correlation ID for distributed tracing
 */
export const requestTracingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    // Generate or use existing request ID
    const requestId = req.get('X-Request-ID') ||
        req.get('x-request-id') ||
        `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Add request ID to request and response
    (req as any).requestId = requestId;
    res.set('X-Request-ID', requestId);

    next();
};

/**
 * Performance monitoring middleware
 * Tracks request performance and logs slow requests
 */
export const performanceMonitoringMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    const originalEnd = res.end;

    res.end = function (chunk?: any, encodingOrCb?: any, cb?: any) {
        const duration = Date.now() - startTime;
        const requestId = (req as any).requestId;
        const correlationId = (req as any).correlationId;

        const logData = {
            requestId,
            correlationId,
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            executionTime: duration
        };

        // Log completions
        if (res.statusCode >= 500) {
            logger.error('Request Completed with Server Error', logData);
        } else if (res.statusCode >= 400) {
            logger.warn('Request Completed with Client Error', logData);
        } else {
            logger.info('Request Completed Successfully', logData);
        }

        // Warn on slow requests (> 1000ms)
        if (duration > 1000) {
            logger.warn('Slow Request Detected', { ...logData, warning: 'Request took longer than 1 second' });
        }

        return originalEnd.apply(this, [chunk, encodingOrCb, cb]);
    };

    next();
};

/**
 * Error logging middleware
 * Specifically for catching and logging errors in the pipeline
 */
export const errorLoggingMiddleware = (err: any, req: Request, res: Response, next: NextFunction): void => {
    const requestId = (req as any).requestId;
    const correlationId = (req as any).correlationId;

    logger.error('Pipeline Error', {
        requestId,
        correlationId,
        method: req.method,
        url: req.url,
        error: err.message,
        stack: err.stack
    });

    next(err);
};

export const loggingMiddlewareStack = [
    requestTracingMiddleware,
    performanceMonitoringMiddleware,
    errorLoggingMiddleware
];

export default loggingMiddlewareStack;
