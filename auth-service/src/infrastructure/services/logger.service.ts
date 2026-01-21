import winston from 'winston';
import { config } from '../../config';

/**
 * Logging Service
 * Enterprise-grade logging with Winston
 * Supports multiple transports and structured logging
 */

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  trace: 4
};

// Define colors for console output
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
  trace: 'gray'
};

// Create Winston logger instance
const winstonLogger = winston.createLogger({
  level: config.logging.level,
  levels: logLevels,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: config.logging.structured.serviceName,
    version: config.logging.structured.version
  },
  transports: []
});

// Add console transport
if (config.logging.console.enabled) {
  winstonLogger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Add file transport
if (config.logging.file.enabled) {
  winstonLogger.add(new winston.transports.File({
    filename: config.logging.file.path,
    maxsize: 10485760, // 10MB
    maxFiles: 5,
    tailable: true,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }));
}

/**
 * Enhanced Logger Interface
 * Provides additional logging methods and structured logging
 */
class LoggerService {
  private logger: winston.Logger;

  constructor(logger: winston.Logger) {
    this.logger = logger;
  }

  // Standard log levels
  error(message: string, meta?: any): void {
    this.logger.error(message, meta);
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  trace(message: string, meta?: any): void {
    this.logger.trace(message, meta);
  }

  // Specialized logging methods
  logSecurityEvent(event: {
    action: string;
    userId?: string;
    email?: string;
    ipAddress: string;
    userAgent: string;
    success: boolean;
    reason?: string;
    metadata?: any;
  }): void {
    this.logger.info('Security Event', {
      type: 'security',
      ...event
    });
  }

  logApiRequest(req: any, res: any, responseTime: number): void {
    this.logger.info('API Request', {
      type: 'api',
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id
    });
  }

  logDatabaseQuery(query: string, duration: number, error?: any): void {
    if (error) {
      this.logger.error('Database Query Failed', {
        type: 'database',
        query,
        duration,
        error: error.message
      });
    } else if (duration > config.database.slowQueryThreshold) {
      this.logger.warn('Slow Database Query', {
        type: 'database',
        query,
        duration
      });
    } else {
      this.logger.debug('Database Query', {
        type: 'database',
        query,
        duration
      });
    }
  }

  logBusinessEvent(event: {
    type: string;
    userId?: string;
    data: any;
    metadata?: any;
  }): void {
    this.logger.info('Business Event', {
      type: 'business',
      ...event
    });
  }

  logPerformanceMetric(metric: {
    name: string;
    value: number;
    unit: string;
    tags?: Record<string, string>;
  }): void {
    this.logger.info('Performance Metric', {
      type: 'performance',
      ...metric
    });
  }

  // Child logger for specific contexts
  child(meta: any): LoggerService {
    return new LoggerService(this.logger.child(meta));
  }

  // Stream interface for Morgan (HTTP request logging)
  stream(level: string = 'info') {
    return {
      write: (message: string) => {
        // Remove trailing newline from Morgan
        const cleanMessage = message.replace(/\n$/, '');
        this.logger.log(level, cleanMessage);
      }
    };
  }
}

// Create and export the logger service instance
export const logger = new LoggerService(winstonLogger);
export default logger;
