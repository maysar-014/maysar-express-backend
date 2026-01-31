import { Request, Response, NextFunction } from 'express';
import { createError } from './error.middleware';

export const validationErrorHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  if (err.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: err.message, details: (err as any).details }
    });
    return;
  }
  next(err);
};
