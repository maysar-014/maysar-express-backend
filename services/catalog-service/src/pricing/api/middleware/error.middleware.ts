import { Request, Response, NextFunction } from 'express';
import { logger } from '../../infrastructure/services/logger.service';

export class APIError extends Error {
    public readonly statusCode: number;
    public readonly code: string | undefined;

    constructor(message: string, statusCode: number = 500, code?: string) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}

export const errorHandler = (
    error: Error,
    req: Request,
    res: Response,
    _next: NextFunction
): void => {
    let statusCode = 500;
    let message = 'Internal server error';
    let code: string | undefined;

    if (error instanceof APIError) {
        statusCode = error.statusCode;
        message = error.message;
        code = error.code;
    }

    logger.error('API Error', {
        method: req.method,
        url: req.url,
        statusCode,
        message,
        error: error.message,
        stack: error.stack
    });

    res.status(statusCode).json({
        error: {
            message,
            code,
            timestamp: new Date().toISOString(),
            path: req.path
        }
    });
};

export const errorMiddleware = errorHandler;
