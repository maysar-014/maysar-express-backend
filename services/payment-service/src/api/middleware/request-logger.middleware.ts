import { Request, Response, NextFunction } from 'express';
import { logger } from '../../infrastructure/services/logger.service';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
        logger.info('Request', { method: req.method, url: req.url, status: res.statusCode, duration: `${Date.now() - start}ms` });
    });
    next();
};
