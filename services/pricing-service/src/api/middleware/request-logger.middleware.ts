import { Request, Response, NextFunction } from 'express';
import { logger } from '../../infrastructure/services/logger.service';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - startTime;
        logger.info('Request Processed', {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration: `${duration}ms`
        });
    });

    next();
};
