import { Request, Response, NextFunction } from 'express';
import { logger } from '../../infrastructure/services/logger.service';
import { metricsCollector } from '../../infrastructure/monitoring/metrics';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const customReq = req as any;
        const logData = {
            requestId: customReq.requestId || req.get('X-Request-ID'),
            correlationId: customReq.correlationId || req.get('X-Correlation-ID'),
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            executionTime: duration
        };

        logger.info('Request Completed', logData);
        
        // Record HTTP metrics
        metricsCollector.recordHttpRequest(
            req.method,
            req.route?.path || req.path,
            res.statusCode,
            duration
        );
    });
    next();
};
