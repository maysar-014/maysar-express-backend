import { Request, Response, NextFunction } from 'express';
import { logger } from '../../infrastructure/services/logger.service';

interface ErrorWithStatus extends Error {
    status?: number;
    statusCode?: number;
}

export const errorHandler = (err: ErrorWithStatus, req: Request, res: Response, _next: NextFunction) => {
    const status = err.statusCode || err.status || (err.name === 'ValidationError' ? 400 : 500);
    logger.error(err.message, { stack: err.stack, path: req.path });
    res.status(status).json({ error: { message: err.message || 'Error', timestamp: new Date() } });
};
