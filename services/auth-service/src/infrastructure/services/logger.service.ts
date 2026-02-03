/**
 * Logger Service for Auth Service
 * Provides structured logging with different levels and output formats
 * Supports both development and production logging configurations
 */

import { createLogger, format, transports, Logger as WinstonLogger } from 'winston';
import { Request } from 'express';

// =====================================================================================
// LOGGING CONFIGURATION
// =====================================================================================

/**
 * Log Level Configuration
 */
export type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'debug';

/**
 * Logger Configuration Interface
 */
export interface LoggerConfig {
  level: LogLevel;
  format: 'json' | 'simple' | 'combined';
  enableConsole: boolean;
  enableFile: boolean;
  filename?: string;
  maxsize?: number;
  maxFiles?: number;
  enableCorrelationId: boolean;
  enableRequestLogging: boolean;
  enablePerformanceLogging: boolean;
  enableSecurityLogging: boolean;
}

/**
 * Default Logger Configuration
 */
export const DEFAULT_LOGGER_CONFIG: LoggerConfig = {
  level: (process.env.LOG_LEVEL as LogLevel) || 'info',
  format: (process.env.LOG_FORMAT as 'json' | 'simple' | 'combined') || 'json',
  enableConsole: process.env.ENABLE_CONSOLE_LOGGING !== 'false',
  enableFile: process.env.ENABLE_FILE_LOGGING === 'true',
  filename: process.env.LOG_FILE_PATH || 'logs/auth-service.log',
  maxsize: parseInt(process.env.LOG_MAX_SIZE || '10485760'), // 10MB
  maxFiles: parseInt(process.env.LOG_MAX_FILES || '5'),
  enableCorrelationId: process.env.ENABLE_CORRELATION_ID === 'true',
  enableRequestLogging: process.env.ENABLE_REQUEST_LOGGING !== 'false',
  enablePerformanceLogging: process.env.ENABLE_PERFORMANCE_LOGGING === 'true',
  enableSecurityLogging: process.env.ENABLE_SECURITY_LOGGING !== 'false'
};

// =====================================================================================
// LOG ENTRIES INTERFACES
// =====================================================================================

/**
 * Base Log Entry Interface
 */
export interface BaseLogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  environment: string;
  correlationId?: string;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Request Log Entry Interface
 */
export interface RequestLogEntry extends BaseLogEntry {
  method: string;
  url: string;
  statusCode: number;
  responseTime: number;
  contentLength?: number;
}

/**
 * Performance Log Entry Interface
 */
export interface PerformanceLogEntry extends BaseLogEntry {
  operation: string;
  duration: number;
  startTime: number;
  endTime: number;
  memoryUsage?: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
}

/**
 * Security Log Entry Interface
 */
export interface SecurityLogEntry extends BaseLogEntry {
  action: string;
  resource?: string;
  result: 'success' | 'failure' | 'blocked';
  reason?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  metadata?: any;
}

// =====================================================================================
// LOGGER SERVICE CLASS
// =====================================================================================

/**
 * Logger Service
 * Provides structured logging with different levels and output formats
 */
export class LoggerService {
  private logger: WinstonLogger;
  private config: LoggerConfig;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = { ...DEFAULT_LOGGER_CONFIG, ...config };
    this.logger = this.createLogger();
  }

  /**
   * Create Winston Logger Instance
   */
  private createLogger(): WinstonLogger {
    const logFormat = this.getLogFormat();
    const logTransports: any[] = [];

    // Console Transport
    if (this.config.enableConsole) {
      logTransports.push(
        new transports.Console({
          format: logFormat,
          level: this.config.level
        })
      );
    }

    // File Transport
    if (this.config.enableFile) {
      logTransports.push(
        new transports.File({
          filename: this.config.filename,
          format: format.combine(
            format.timestamp(),
            format.errors({ stack: true }),
            format.json()
          ),
          maxsize: this.config.maxsize,
          maxFiles: this.config.maxFiles,
          level: 'error'
        })
      );

      logTransports.push(
        new transports.File({
          filename: this.config.filename.replace('.log', '.combined.log'),
          format: logFormat,
          maxsize: this.config.maxsize,
          maxFiles: this.config.maxFiles,
          level: this.config.level
        })
      );
    }

    return createLogger({
      level: this.config.level,
      format: logFormat,
      transports: logTransports,
      exitOnError: false
    });
  }

  /**
   * Get Log Format Based on Configuration
   */
  private getLogFormat() {
    const baseFormat = format.combine(
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      format.errors({ stack: true }),
      format.metadata({ fillExcept: ['message', 'level', 'timestamp'] })
    );

    switch (this.config.format) {
      case 'simple':
        return format.combine(
          baseFormat,
          format.simple()
        );

      case 'combined':
        return format.combine(
          baseFormat,
          format.printf(({ timestamp, level, message, metadata }) => {
            return `${timestamp} [${level.toUpperCase()}]: ${message} ${metadata ? JSON.stringify(metadata) : ''}`;
          })
        );

      case 'json':
      default:
        return format.combine(
          baseFormat,
          format.json()
        );
    }
  }

  // =====================================================================================
  // LOGGING METHODS
  // =====================================================================================

  /**
   * Log Error
   */
  error(message: string, error?: Error, metadata?: any): void {
    const logEntry = this.createBaseLogEntry('error', message, metadata);
    if (error) {
      logEntry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }
    this.logger.error(message, { ...logEntry, error });
  }

  /**
   * Log Warning
   */
  warn(message: string, metadata?: any): void {
    const logEntry = this.createBaseLogEntry('warn', message, metadata);
    this.logger.warn(message, logEntry);
  }

  /**
   * Log Info
   */
  info(message: string, metadata?: any): void {
    const logEntry = this.createBaseLogEntry('info', message, metadata);
    this.logger.info(message, logEntry);
  }

  /**
   * Log HTTP Request
   */
  http(message: string, req: Request, statusCode: number, responseTime: number, metadata?: any): void {
    if (!this.config.enableRequestLogging) return;

    const logEntry: RequestLogEntry = {
      ...this.createBaseLogEntry('http', message, metadata),
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode,
      responseTime,
      contentLength: parseInt(req.headers['content-length'] || '0'),
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    };

    this.logger.http(message, logEntry);
  }

  /**
   * Log Debug
   */
  debug(message: string, metadata?: any): void {
    const logEntry = this.createBaseLogEntry('debug', message, metadata);
    this.logger.debug(message, logEntry);
  }

  // =====================================================================================
  // SPECIALIZED LOGGING METHODS
  // =====================================================================================

  /**
   * Log Performance Metrics
   */
  performance(operation: string, duration: number, startTime: number, endTime: number, metadata?: any): void {
    if (!this.config.enablePerformanceLogging) return;

    const logEntry: PerformanceLogEntry = {
      ...this.createBaseLogEntry('info', `Performance: ${operation}`, metadata),
      operation,
      duration,
      startTime,
      endTime,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    };

    this.logger.info(`Performance: ${operation}`, logEntry);
  }

  /**
   * Log Security Events
   */
  security(action: string, result: 'success' | 'failure' | 'blocked', riskLevel: 'low' | 'medium' | 'high' | 'critical', metadata?: any): void {
    if (!this.config.enableSecurityLogging) return;

    const logEntry: SecurityLogEntry = {
      ...this.createBaseLogEntry('warn', `Security: ${action}`, metadata),
      action,
      result,
      riskLevel,
      metadata
    };

    this.logger.warn(`Security: ${action}`, logEntry);
  }

  /**
   * Log Authentication Events
   */
  auth(action: string, userId: string, success: boolean, reason?: string, metadata?: any): void {
    const riskLevel: 'low' | 'medium' | 'high' | 'critical' = success ? 'low' : 'medium';
    const result: 'success' | 'failure' | 'blocked' = success ? 'success' : 'failure';

    this.security(`Auth: ${action}`, result, riskLevel, {
      ...metadata,
      userId,
      reason
    });
  }

  /**
   * Log Authorization Events
   */
  authorization(action: string, userId: string, resource: string, granted: boolean, reason?: string, metadata?: any): void {
    const riskLevel: 'low' | 'medium' | 'high' | 'critical' = granted ? 'low' : 'high';
    const result: 'success' | 'failure' | 'blocked' = granted ? 'success' : 'blocked';

    this.security(`AuthZ: ${action}`, result, riskLevel, {
      ...metadata,
      userId,
      resource,
      granted,
      reason
    });
  }

  /**
   * Log Token Events
   */
  token(action: string, userId: string, success: boolean, reason?: string, metadata?: any): void {
    const riskLevel: 'low' | 'medium' | 'high' | 'critical' = success ? 'low' : 'high';
    const result: 'success' | 'failure' | 'blocked' = success ? 'success' : 'failure';

    this.security(`Token: ${action}`, result, riskLevel, {
      ...metadata,
      userId,
      reason
    });
  }

  /**
   * Log API Key Events
   */
  apiKey(action: string, serviceId: string, success: boolean, reason?: string, metadata?: any): void {
    const riskLevel: 'low' | 'medium' | 'high' | 'critical' = success ? 'low' : 'high';
    const result: 'success' | 'failure' | 'blocked' = success ? 'success' : 'failure';

    this.security(`API Key: ${action}`, result, riskLevel, {
      ...metadata,
      serviceId,
      reason
    });
  }

  // =====================================================================================
  // UTILITY METHODS
  // =====================================================================================

  /**
   * Create Base Log Entry
   */
  private createBaseLogEntry(level: LogLevel, message: string, metadata?: any): BaseLogEntry {
    const correlationId = this.config.enableCorrelationId ? this.generateCorrelationId() : undefined;

    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: 'auth-service',
      environment: process.env.NODE_ENV || 'development',
      correlationId,
      ...metadata
    };
  }

  /**
   * Generate Correlation ID
   */
  private generateCorrelationId(): string {
    return `correlation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get Logger Instance (for advanced usage)
   */
  getLogger(): WinstonLogger {
    return this.logger;
  }

  /**
   * Update Logger Configuration
   */
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger = this.createLogger(); // Recreate logger with new config
  }

  /**
   * Get Current Configuration
   */
  getConfig(): LoggerConfig {
    return { ...this.config };
  }

  /**
   * Enable/Disable Specific Logging Features
   */
  enableRequestLogging(enable: boolean): void {
    this.config.enableRequestLogging = enable;
  }

  enablePerformanceLogging(enable: boolean): void {
    this.config.enablePerformanceLogging = enable;
  }

  enableSecurityLogging(enable: boolean): void {
    this.config.enableSecurityLogging = enable;
  }

  enableCorrelationId(enable: boolean): void {
    this.config.enableCorrelationId = enable;
  }
}

// =====================================================================================
// GLOBAL LOGGER INSTANCE
// =====================================================================================

/**
 * Default Logger Service Instance
 * Can be used throughout the application
 */
export const logger = new LoggerService();

// =====================================================================================
// LOGGING MIDDLEWARE
// =====================================================================================

/**
 * Request Logging Middleware
 */
export function requestLoggingMiddleware(loggerService: LoggerService = logger) {
  return (req: Request, res: any, next: Function) => {
    const startTime = Date.now();

    // Log request start
    loggerService.http('Request started', req, 0, 0, {
      requestId: req.headers['x-request-id'] || 'unknown'
    });

    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      loggerService.http('Request completed', req, res.statusCode, responseTime, {
        requestId: req.headers['x-request-id'] || 'unknown',
        contentLength: res.getHeader('content-length') || 0
      });

      originalEnd.call(this, chunk, encoding);
    };

    next();
  };
}

// =====================================================================================
// PERFORMANCE MONITORING
// =====================================================================================

/**
 * Performance Monitoring Decorator
 */
export function logPerformance(operationName: string) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args: any[]) {
      const startTime = Date.now();
      const startMemory = process.memoryUsage();
      const startCpu = process.cpuUsage();

      try {
        const result = await originalMethod.apply(this, args);
        const endTime = Date.now();
        const endMemory = process.memoryUsage();
        const endCpu = process.cpuUsage(startCpu);

        const duration = endTime - startTime;
        const memoryDelta = {
          rss: endMemory.rss - startMemory.rss,
          heapTotal: endMemory.heapTotal - startMemory.heapTotal,
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          external: endMemory.external - startMemory.external
        };

        logger.performance(operationName, duration, startTime, endTime, {
          memoryDelta,
          cpuDelta: endCpu,
          args: args.length > 0 ? args.map(arg => typeof arg) : 'none'
        });

        return result;
      } catch (error) {
        const endTime = Date.now();
        const duration = endTime - startTime;

        logger.error(`Performance monitoring error in ${operationName}`, error as Error, {
          duration,
          startTime,
          endTime
        });

        throw error;
      }
    };

    return descriptor;
  };
}