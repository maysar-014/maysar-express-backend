import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Middleware to extract or generate a correlation ID
 * Ensures req.body.correlationId is populated for Joi validation
 * and downstream tracking.
 */
export const correlationMiddleware = (req: Request, _res: Response, next: NextFunction) => {
    const correlationId =
        req.headers['x-correlation-id'] as string ||
        req.body.correlationId ||
        randomUUID();

    // Ensure it's in the body for Joi .required() checks
    req.body.correlationId = correlationId;

    // Also set in headers for response/downstream
    req.headers['x-correlation-id'] = correlationId;

    next();
};
