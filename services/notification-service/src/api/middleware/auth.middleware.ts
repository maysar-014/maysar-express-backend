import { Request, Response, NextFunction } from 'express';
import { createError } from './error.middleware';

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = Array.isArray(req.headers.authorization)
    ? req.headers.authorization[0]
    : req.headers.authorization;
  const apiKeyHeader = Array.isArray(req.headers['x-api-key'])
    ? req.headers['x-api-key'][0]
    : req.headers['x-api-key'];
  const userIdHeader = Array.isArray(req.headers['x-user-id'])
    ? req.headers['x-user-id'][0]
    : req.headers['x-user-id'];
  const token = authHeader?.replace(/^Bearer\s+/i, '') || apiKeyHeader;
  const userId = userIdHeader;
  if (!token && !userId) {
    next(createError.unauthorized('Authentication required'));
    return;
  }
  (req as any).userId = userId || 'anonymous';
  (req as any).token = token;
  next();
};

export const optionalAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const userId = Array.isArray(req.headers['x-user-id']) ? req.headers['x-user-id'][0] : req.headers['x-user-id'];
  (req as any).userId = userId || undefined;
  next();
};
