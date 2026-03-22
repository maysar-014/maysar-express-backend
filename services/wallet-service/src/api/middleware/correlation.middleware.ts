import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Middleware to extract or generate a correlation ID
 * Keeps a request correlation ID in headers for tracing without mutating the
 * request body, so body validation can reject missing or invalid IDs.
 */
export const correlationMiddleware = (req: Request, _res: Response, next: NextFunction) => {
    const headerValue = req.headers['x-correlation-id'];
    const headerCorrelationId = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    const bodyCorrelationId =
        req.body && typeof req.body === 'object' && !Array.isArray(req.body)
            ? (req.body as Record<string, unknown>).correlationId
            : undefined;

    const isUuid = (value: unknown): value is string => {
        if (typeof value !== 'string') return false;
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
    };

    const correlationId =
        (isUuid(headerCorrelationId) && headerCorrelationId)
        || (isUuid(bodyCorrelationId) && bodyCorrelationId)
        || randomUUID();

    // Also set in headers for response/downstream
    req.headers['x-correlation-id'] = correlationId;

    next();
};
