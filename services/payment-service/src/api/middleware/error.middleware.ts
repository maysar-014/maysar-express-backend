import { Request, Response, NextFunction } from 'express';
import { logger } from '../../infrastructure/services/logger.service';

export const errorHandler = (err: any, req: Request, res: Response, _next: NextFunction) => {
    const statusCode = err.statusCode || 500;
    logger.error('Error', { message: err.message, stack: err.stack, path: req.path });
    res.status(statusCode).json({ error: { message: err.message || 'Internal Server Error', timestamp: new Date().toISOString() } });
};
