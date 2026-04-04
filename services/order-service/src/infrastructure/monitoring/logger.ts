/**
 * Logger Infrastructure
 * Structured logging with Winston for comprehensive observability
 */

import winston from 'winston';
import { loggingConfig } from '../../config/monitoring.config';
import { AppError } from '../../domain/errors';
import { LogContext } from '../../../../../shared/logger/logger';
import { createSafeFileTransports } from '../../../../../shared/logger/file-transports';
import { normalizeLogMeta, serializeError } from '../../../../../shared/logger/error-utils';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
};

// Add colors to winston
winston.addColors(colors);

// Create custom format
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.colorize({ all: loggingConfig.colorize })
);

// Console transport for development
const consoleTransport = new winston.transports.Console({
  level: loggingConfig.level,
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
      return `${timestamp} ${level}: ${message} ${metaStr}`;
    })
  ),
});

// Create the logger
export const logger = winston.createLogger({
  level: loggingConfig.level,
  levels,
  format: customFormat,
  transports: [
    ...(loggingConfig.transports.console ? [consoleTransport] : []),
    ...(loggingConfig.transports.file ? createSafeFileTransports([
      {
        filename: loggingConfig.transports.filePath || 'logs/order-service.log',
        level: loggingConfig.level,
        format: winston.format.combine(
          winston.format.uncolorize(),
          winston.format.json()
        ),
        maxsize: 5242880, // 5MB
        maxFiles: loggingConfig.transports.maxFiles,
      },
      {
        filename: loggingConfig.transports.filePath?.replace('.log', '-error.log') || 'logs/order-service-error.log',
        level: 'error',
        format: winston.format.combine(
          winston.format.uncolorize(),
          winston.format.json()
        ),
        maxsize: 5242880, // 5MB
        maxFiles: 30,
      }
    ]) : []),
  ],
  exitOnError: false,
});

// Custom logger methods for specific use cases
export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private formatMessage(message: string, meta?: LogContext & Record<string, any>): any {
    const normalizedMeta = normalizeLogMeta(meta);

    return {
      message,
      context: this.context,
      timestamp: new Date().toISOString(),
      requestId: meta?.requestId,
      correlationId: meta?.correlationId,
      sagaId: meta?.sagaId,
      eventId: meta?.eventId,
      executionTime: meta?.executionTime,
      ...(normalizedMeta ?? {}),
    };
  }

  error(message: string, error?: any, meta?: any): void {
    const logMeta = { ...meta } as Record<string, any>;

    if (typeof error !== 'undefined') {
      logMeta.error = error instanceof AppError
        ? {
          type: error.type,
          severity: error.severity,
          context: error.context,
          stack: error.stack,
        }
        : serializeError(error);
    }

    const logData = this.formatMessage(message, logMeta);
    logger.error(message, logData);
  }

  warn(message: string, meta?: any): void {
    logger.warn(message, this.formatMessage(message, meta));
  }

  info(message: string, meta?: any): void {
    logger.info(message, this.formatMessage(message, meta));
  }

  debug(message: string, meta?: any): void {
    logger.debug(message, this.formatMessage(message, meta));
  }

  // Business-specific logging methods
  audit(action: string, userId: string, resource: string, details?: any): void {
    this.info(`AUDIT: ${action}`, {
      audit: {
        action,
        userId,
        resource,
        timestamp: new Date().toISOString(),
        ...details,
      },
    });
  }

  performance(operation: string, duration: number, meta?: any): void {
    this.info(`PERFORMANCE: ${operation}`, {
      performance: {
        operation,
        duration,
        unit: 'ms',
        ...meta,
      },
    });
  }

  security(event: string, severity: 'low' | 'medium' | 'high' | 'critical', details?: any): void {
    const level = severity === 'critical' || severity === 'high' ? 'error' :
      severity === 'medium' ? 'warn' : 'info';

    this[level](`SECURITY: ${event}`, {
      security: {
        event,
        severity,
        timestamp: new Date().toISOString(),
        ...details,
      },
    });
  }

  api(method: string, path: string, statusCode: number, duration: number, userId?: string): void {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

    this[level](`API: ${method} ${path}`, {
      api: {
        method,
        path,
        statusCode,
        duration,
        userId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  database(operation: string, table: string, duration: number, success: boolean, error?: any): void {
    const level = success ? 'debug' : 'error';

    this[level](`DATABASE: ${operation}`, {
      database: {
        operation,
        table,
        duration,
        success,
        error: error?.message,
        timestamp: new Date().toISOString(),
      },
    });
  }

  external(service: string, operation: string, duration: number, success: boolean, error?: any): void {
    const level = success ? 'debug' : 'error';

    this[level](`EXTERNAL: ${service}.${operation}`, {
      external: {
        service,
        operation,
        duration,
        success,
        error: error?.message,
        timestamp: new Date().toISOString(),
      },
    });
  }
}

// Global logger instances
export const appLogger = new Logger('application');
export const apiLogger = new Logger('api');
export const dbLogger = new Logger('database');
export const securityLogger = new Logger('security');
export const performanceLogger = new Logger('performance');

// Utility functions
export function createLogger(context: string): Logger {
  return new Logger(context);
}

export function logRequest(req: any, res: any, next: any): void {
  const start = Date.now();
  const originalEnd = res.end;

  res.end = function (...args: any[]) {
    const duration = Date.now() - start;
    const userId = req.user?.id || req.headers['x-user-id'];

    apiLogger.api(req.method, req.path, res.statusCode, duration, userId);

    // Log slow requests
    if (duration > 1000) {
      performanceLogger.performance(`slow_request_${req.method}_${req.path}`, duration, {
        statusCode: res.statusCode,
        userId,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      });
    }

    originalEnd.apply(this, args);
  };

  next();
}

// Log application startup
export function logStartup(): void {
  appLogger.info('Application starting', {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    pid: process.pid,
    uptime: process.uptime(),
  });
}

// Log application shutdown
export function logShutdown(signal?: string): void {
  appLogger.info('Application shutting down', {
    signal,
    uptime: process.uptime(),
  });
}

// Flush logs before exit
export function flushLogs(): Promise<void> {
  return new Promise((resolve) => {
    logger.on('finish', resolve);
    logger.end();
  });
}

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  const serializedError = serializeError(error);
  console.error('[FATAL] Uncaught Exception:', serializedError);
  appLogger.error('Uncaught Exception', serializedError);
  flushLogs().finally(() => process.exit(1));
});

process.on('unhandledRejection', (reason, promise) => {
  const serializedReason = serializeError(reason);
  appLogger.error('Unhandled Rejection', {
    reason: serializedReason,
    promise: '[Promise]',
  });
  // Don't exit on unhandled rejections in production
  if (process.env.NODE_ENV === 'production') {
    appLogger.warn('Continuing after unhandled rejection in production');
  }
});

export default logger;
