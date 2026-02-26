import { Request, Response, NextFunction } from 'express';
import { logger } from '../../infrastructure/services/logger.service';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    // Track response finished
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.logRequest(
            req.method,
            req.originalUrl || req.url,
            res.statusCode,
            duration,
            (req as any).user?.id // Assume user id might be attached later
        );
    });

    next();
};
