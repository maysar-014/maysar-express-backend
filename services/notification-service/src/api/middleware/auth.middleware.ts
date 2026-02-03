import { Request, Response, NextFunction } from 'express';
import { createError } from './error.middleware';

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.get('Authorization')?.replace(/^Bearer\s+/i) || req.get('X-API-Key');
  const userId = req.get('X-User-Id');
  if (!token && !userId) {
    next(createError.unauthorized('Authentication required'));
    return;
  }
  (req as any).userId = userId || 'anonymous';
  (req as any).token = token;
  next();
};

export const optionalAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const userId = req.get('X-User-Id');
  (req as any).userId = userId || undefined;
  next();
};
