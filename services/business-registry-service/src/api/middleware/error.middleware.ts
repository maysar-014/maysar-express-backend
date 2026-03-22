import { Request, Response, NextFunction } from 'express';
import {
  BusinessAlreadyExistsError,
  BusinessNotFoundError,
  BusinessValidationError,
  BusinessSuspendedError,
  UnauthorizedBusinessOperationError,
  InvalidRegistrationNumberError
} from '../../domain/errors/business.errors';
import { logger } from '../../infrastructure/services/logger.service';

export function errorMiddleware(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  logger.error('Request error', {
    message: err.message,
    stack: err.stack,
    name: err.name
  });

  if (err instanceof BusinessNotFoundError) {
    res.status(404).json({
      success: false,
      error: { code: 'BUSINESS_NOT_FOUND', message: err.message }
    });
    return;
  }

  if (err instanceof BusinessAlreadyExistsError) {
    res.status(409).json({
      success: false,
      error: { code: 'BUSINESS_ALREADY_EXISTS', message: err.message }
    });
    return;
  }

  if (
    err instanceof BusinessValidationError ||
    err instanceof InvalidRegistrationNumberError
  ) {
    const normalized = err.message.toLowerCase();
    const status = normalized.includes('already verified')
      || normalized.includes('only suspended businesses can be reactivated')
      || normalized.includes('already suspended')
      || normalized.includes('conflict')
      ? 409
      : 400;
    res.status(status).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: err.message }
    });
    return;
  }

  if (err instanceof BusinessSuspendedError) {
    res.status(403).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: err.message }
    });
    return;
  }

  if (err instanceof UnauthorizedBusinessOperationError) {
    const normalized = err.message.toLowerCase();
    const status = normalized.includes('suspended')
      || normalized.includes('closed')
      || normalized.includes('reactivate')
      ? 409
      : 403;
    res.status(status).json({
      success: false,
      error: { code: status === 409 ? 'CONFLICT' : 'UNAUTHORIZED', message: err.message }
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message
    }
  });
}
