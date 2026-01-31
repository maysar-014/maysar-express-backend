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
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: err.message }
    });
    return;
  }

  if (err instanceof BusinessSuspendedError || err instanceof UnauthorizedBusinessOperationError) {
    res.status(403).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: err.message }
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
