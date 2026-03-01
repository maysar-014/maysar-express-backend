import { Request, Response, NextFunction } from 'express';
import { logger } from '../../infrastructure/services/logger.service';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        // Cast req to 'any' to access custom properties like requestId and correlationId
        const customReq = req as any;
        const logData = {
            requestId: customReq.requestId || req.get('X-Request-ID'),
            correlationId: customReq.correlationId || req.get('X-Correlation-ID'),
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            executionTime: duration
        };

        if (res.statusCode >= 500) {
            logger.error('Request Completed with Server Error', logData);
        } else if (res.statusCode >= 400) {
            logger.warn('Request Completed with Client Error', logData);
        } else {
            logger.info('Request Completed', logData);
        }
    });
    next();
};
