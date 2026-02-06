import { Request, Response, NextFunction } from 'express';
import { logger } from '../../infrastructure/services/logger.service';

export const errorHandler = (err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || 500;
    logger.error(err.message, { stack: err.stack, path: req.path });
    res.status(status).json({ error: { message: err.message || 'Error', timestamp: new Date() } });
};
