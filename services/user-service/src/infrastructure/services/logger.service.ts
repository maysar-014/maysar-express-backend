import winston from 'winston';

/**
 * Logging levels for the application
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

/**
 * Logger service for structured logging across the User Service
 */
export class Logger {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.colorize({ all: true })
      ),
      defaultMeta: {
        service: 'user-service',
        version: process.env.npm_package_version || '1.0.0'
      },
      transports: [
        // Console transport for development
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),

        // File transport for production logs
        ...(process.env.NODE_ENV === 'production' ? [
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
          }),
          new winston.transports.File({
            filename: 'logs/combined.log',
            maxsize: 5242880, // 5MB
            maxFiles: 5
          })
        ] : [])
      ]
    });

    // Handle uncaught exceptions
    this.logger.exceptions.handle(
      new winston.transports.File({ filename: 'logs/exceptions.log' })
    );

    // Handle unhandled promise rejections
    this.logger.rejections.handle(
      new winston.transports.File({ filename: 'logs/rejections.log' })
    );
  }

  /**
   * Log error messages
   */
  error(message: string, meta?: Record<string, any>): void {
    this.logger.error(message, meta);
  }

  /**
   * Log warning messages
   */
  warn(message: string, meta?: Record<string, any>): void {
    this.logger.warn(message, meta);
  }

  /**
   * Log info messages
   */
  info(message: string, meta?: Record<string, any>): void {
    this.logger.info(message, meta);
  }

  /**
   * Log debug messages
   */
  debug(message: string, meta?: Record<string, any>): void {
    this.logger.debug(message, meta);
  }

  /**
   * Create a child logger with additional context
   */
  child(meta: Record<string, any>): Logger {
    const childLogger = new Logger();
    childLogger.logger = this.logger.child(meta);
    return childLogger;
  }

  /**
   * Log HTTP requests
   */
  logRequest(method: string, url: string, statusCode: number, duration: number, userId?: string): void {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

    this.logger.log(level, 'HTTP Request', {
      method,
      url,
      statusCode,
      duration: `${duration}ms`,
      userId
    });
  }

  /**
   * Log database operations
   */
  logDatabase(operation: string, table: string, duration: number, success: boolean, error?: string): void {
    const level = success ? 'debug' : 'error';

    this.logger.log(level, 'Database Operation', {
      operation,
      table,
      duration: `${duration}ms`,
      success,
      error: error || undefined
    });
  }

  /**
   * Log business events
   */
  logBusiness(event: string, userId?: string, details?: Record<string, any>): void {
    this.logger.info('Business Event', {
      event,
      userId,
      ...details
    });
  }

  /**
   * Log security events
   */
  logSecurity(event: string, userId?: string, ipAddress?: string, details?: Record<string, any>): void {
    this.logger.warn('Security Event', {
      event,
      userId,
      ipAddress,
      ...details
    });
  }

  /**
   * Log performance metrics
   */
  logPerformance(operation: string, duration: number, metadata?: Record<string, any>): void {
    this.logger.info('Performance Metric', {
      operation,
      duration: `${duration}ms`,
      ...metadata
    });
  }
}

// Export singleton instance
export const logger = new Logger();
