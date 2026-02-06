import { Request, Response, NextFunction } from 'express';
import { logger } from '../../infrastructure/services/logger.service';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    const requestId = req.get('X-Request-ID') || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    res.set('X-Request-ID', requestId);

    logger.info('Request Started', {
        requestId,
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip
    });

    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const logData = {
            requestId,
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration: `${duration}ms`
        };

        if (res.statusCode >= 500) {
            logger.error('Request Completed with Server Error', logData);
        } else if (res.statusCode >= 400) {
            logger.warn('Request Completed with Client Error', logData);
        } else {
            logger.info('Request Completed Successfully', logData);
        }

        if (duration > 1000) {
            logger.logPerformance('Slow Request', duration, { requestId });
        }
    });

    next();
};
