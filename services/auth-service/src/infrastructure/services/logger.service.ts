import { ServiceLogger, LogContext } from '@shared/logger/logger';
import { Request, Response, NextFunction } from 'express';

export class Logger {
  private delegate: ServiceLogger;

  constructor() {
    this.delegate = new ServiceLogger('AuthService', 'auth-service');
  }

  error(msg: string, meta?: LogContext & Record<string, any>) { this.delegate.error(msg, meta); }
  warn(msg: string, meta?: LogContext & Record<string, any>) { this.delegate.warn(msg, meta); }
  info(msg: string, meta?: LogContext & Record<string, any>) { this.delegate.info(msg, meta); }
  debug(msg: string, meta?: LogContext & Record<string, any>) { this.delegate.debug(msg, meta); }

  /** legacy support */
  log(level: string, msg: string, meta?: any) {
    if (level === 'error') this.error(msg, meta);
    else if (level === 'warn') this.warn(msg, meta);
    else this.info(msg, meta);
  }

  logPerformance(operation: string, duration: number, metadata?: Record<string, any>) {
    this.delegate.performance(operation, duration, metadata);
  }
}

export const logger = new Logger();

export const requestLoggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`
    });
  });
  next();
};
