import { Request, Response, NextFunction } from 'express';
import { NotFoundError, BusinessRuleError, ValidationError } from '../../domain/errors/domain.error';

export function errorHandlerMiddleware(err: Error, req: Request, res: Response, _next: NextFunction): void {
    // Log error for debugging

    let status = 500;
    const message = err.message || 'Internal Server Error';
    let errors: string[] | undefined = undefined;

    if (err instanceof NotFoundError || err.name === 'NotFoundError') {
        status = 404;
    } else if (err instanceof BusinessRuleError || err.name === 'BusinessRuleError') {
        status = 400;
    } else if (err instanceof ValidationError || err.name === 'ValidationError') {
        status = 400;
        errors = (err as ValidationError).errors;
    }

    res.status(status).json({
        error: message,
        errors,
        correlationId: req.headers['x-correlation-id'],
        timestamp: new Date().toISOString()
    });
}
