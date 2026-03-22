import { Request, Response, NextFunction } from 'express';
import { logger } from '../../infrastructure/services/logger.service';
import {
    InvalidPhoneNumberError,
    MessageTooLongError,
    MessageNotFoundError,
    RateLimitExceededError,
    ProviderNotAvailableError,
    ProviderError,
    InvalidStateTransitionError,
    MaxRetriesExceededError
} from '../../domain/errors/sms.errors';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    let status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    if (err instanceof MessageNotFoundError) status = 404;
    if (err instanceof InvalidPhoneNumberError || err instanceof MessageTooLongError || err instanceof InvalidStateTransitionError) status = 400;
    if (err instanceof RateLimitExceededError) status = 429;
    if (err instanceof ProviderNotAvailableError) status = 503;
    if (err instanceof ProviderError) status = 502;
    if (err instanceof MaxRetriesExceededError) status = 409;

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
