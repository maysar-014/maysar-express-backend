/**
 * Request Logger Middleware
 * 
 * Handles request logging for the Maysar API Gateway
 */

import { Request, Response, NextFunction } from 'express';
import { LogEntry } from '../types';

export interface RequestLoggerOptions {
  logLevel?: 'error' | 'warn' | 'info' | 'debug';
  logRequestHeaders?: boolean;
  logRequestBody?: boolean;
  logResponseHeaders?: boolean;
  logResponseBody?: boolean;
  excludePaths?: string[];
  includePaths?: string[];
}

export class RequestLoggerMiddleware {
  private options: RequestLoggerOptions;

  constructor(options?: Partial<RequestLoggerOptions>) {
    this.options = {
      logLevel: 'info',
      logRequestHeaders: false,
      logRequestBody: false,
      logResponseHeaders: false,
      logResponseBody: false,
      excludePaths: ['/health', '/metrics', '/favicon.ico'],
      includePaths: [],
      ...options,
    };
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Check if path should be logged
      if (this.shouldSkipLogging(req.path)) {
        return next();
      }

      const startTime = Date.now();
      const requestId = this.generateRequestId();

      // Add request ID to request object
      (req as any).requestId = requestId;

      // Log request start
      this.logRequestStart(req, requestId);

      // Capture original response methods
      const originalSend = res.send;
      const originalJson = res.json;
      const originalStatus = res.status;

      let responseBody: any;
      let statusCode = res.statusCode;

      // Override response methods to capture response data
      res.send = function(body?: any) {
        responseBody = body;
        return originalSend.call(this, body);
      };

      res.json = function(body?: any) {
        responseBody = body;
        return originalJson.call(this, body);
      };

      res.status = function(code: number) {
        statusCode = code;
        return originalStatus.call(this, code);
      };

      // Log response when finished
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        this.logRequestEnd(req, res, responseBody, duration, requestId);
      });

      next();
    };
  }

  private shouldSkipLogging(path: string): boolean {
    // Check exclude paths
    if (this.options.excludePaths?.some(excludePath => path.startsWith(excludePath))) {
      return true;
    }

    // Check include paths (if specified, only log these paths)
    if (this.options.includePaths && this.options.includePaths.length > 0) {
      return !this.options.includePaths.some(includePath => path.startsWith(includePath));
    }

    return false;
  }

  private logRequestStart(req: Request, requestId: string): void {
    const logEntry: LogEntry = {
      timestamp: new Date(),
      level: this.options.logLevel!,
      message: `Request started: ${req.method} ${req.path}`,
      service: 'api-gateway',
      requestId,
      metadata: {
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        ...(this.options.logRequestHeaders && { headers: req.headers }),
        ...(this.options.logRequestBody && req.body && { body: req.body }),
      },
    };

    this.writeLog(logEntry);
  }

  private logRequestEnd(req: Request, res: Response, responseBody: any, duration: number, requestId: string): void {
    const level = this.getLogLevel(res.statusCode);
    const logEntry: LogEntry = {
      timestamp: new Date(),
      level,
      message: `Request completed: ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`,
      service: 'api-gateway',
      requestId,
      metadata: {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        ...(this.options.logResponseHeaders && { responseHeaders: res.getHeaders() }),
        ...(this.options.logResponseBody && responseBody && { responseBody }),
      },
    };

    this.writeLog(logEntry);
  }

  private getLogLevel(statusCode: number): 'error' | 'warn' | 'info' | 'debug' {
    if (statusCode >= 500) return 'error';
    if (statusCode >= 400) return 'warn';
    if (statusCode >= 300) return 'info';
    return this.options.logLevel!;
  }

  private writeLog(logEntry: LogEntry): void {
    const logMessage = JSON.stringify({
      timestamp: logEntry.timestamp.toISOString(),
      level: logEntry.level,
      message: logEntry.message,
      service: logEntry.service,
      requestId: logEntry.requestId,
      metadata: logEntry.metadata,
    });

    switch (logEntry.level) {
      case 'error':
        console.error(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      case 'info':
        console.info(logMessage);
        break;
      case 'debug':
        console.debug(logMessage);
        break;
    }
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Utility method to get request ID from request
  static getRequestId(req: Request): string {
    return (req as any).requestId || 'unknown';
  }

  // Utility method to log custom message
  static logCustom(level: 'error' | 'warn' | 'info' | 'debug', message: string, metadata?: any): void {
    const logEntry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      service: 'api-gateway',
      requestId: 'system',
      metadata,
    };

    const logMessage = JSON.stringify({
      timestamp: logEntry.timestamp.toISOString(),
      level: logEntry.level,
      message: logEntry.message,
      service: logEntry.service,
      requestId: logEntry.requestId,
      metadata: logEntry.metadata,
    });

    switch (level) {
      case 'error':
        console.error(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      case 'info':
        console.info(logMessage);
        break;
      case 'debug':
        console.debug(logMessage);
        break;
    }
  }
}

// Default request logger middleware instance
export const requestLoggerMiddleware = new RequestLoggerMiddleware();

// Export middleware function
export const requestLogger = requestLoggerMiddleware.middleware();