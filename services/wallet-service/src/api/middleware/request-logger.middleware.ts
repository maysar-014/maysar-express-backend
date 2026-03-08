import { Request, Response, NextFunction } from 'express';
import { logger } from '../../infrastructure/services/logger.service';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    const requestId = req.get('X-Request-ID') || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    req.requestId = requestId;

    res.set('X-Request-ID', requestId);

    logger.info('Request Started', {
        requestId,
        correlationId: req.correlationId,
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip
    });

    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const logData = {
            requestId: req.requestId || req.get('X-Request-ID'),
            correlationId: req.correlationId || req.get('X-Correlation-ID'),
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            executionTime: duration,
            userId: req.user?.userId
        };

        if (res.statusCode >= 500) {
            logger.error('Request Completed with Server Error', logData);
        } else if (res.statusCode >= 400) {
            logger.warn('Request Completed with Client Error', logData);
        } else {
            logger.info('Request Completed', logData);
        }

        if (duration > 1000) {
            logger.logPerformance('Slow Request', duration, { requestId });
        }
    });

    next();
};
