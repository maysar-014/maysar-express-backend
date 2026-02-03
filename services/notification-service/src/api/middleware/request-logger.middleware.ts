import { Request, Response, NextFunction } from 'express';
import { logger } from '../../infrastructure/services/logger.service';

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 11)}`;
}

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const requestId = req.get('X-Request-ID') || generateRequestId();
  res.set('X-Request-ID', requestId);
  (req as any).startTime = startTime;
  (req as any).requestId = requestId;
  logger.info('Request Started', { requestId, method: req.method, url: req.url, path: req.path });
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    logger.log(level, 'Request Completed', {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`
    });
  });
  next();
};
