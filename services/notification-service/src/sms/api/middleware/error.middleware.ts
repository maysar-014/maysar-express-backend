import { Request, Response, NextFunction } from 'express';
import { logger } from '../../infrastructure/services/logger.service';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    logger.error(message, {
        status,
        url: req.originalUrl,
        method: req.method,
        stack: err.stack,
        userId: (req as any).user?.id
    });

    res.status(status).json({
        error: {
            message,
            status,
            timestamp: new Date().toISOString(),
            path: req.originalUrl
        }
    });
};

export const validationErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: {
                message: 'Validation Failed',
                details: err.details,
                timestamp: new Date().toISOString()
            }
        });
    }
    next(err);
};
