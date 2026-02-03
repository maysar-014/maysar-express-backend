/**
 * Structured Logger
 * Provides consistent logging with correlation IDs
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  correlationId?: string;
  userId?: string;
  service: string;
  data?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export class Logger {
  private service: string;

  constructor(service: string = 'checkout-service') {
    this.service = service;
  }

  private format(entry: LogEntry): string {
    return JSON.stringify(entry);
  }

  private log(level: LogLevel, message: string, data?: any, error?: Error, correlationId?: string): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.service,
      correlationId,
      data
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }

    const output = this.format(entry);
    
    if (level === LogLevel.ERROR) {
      console.error(output);
    } else if (level === LogLevel.WARN) {
      console.warn(output);
    } else {
      console.log(output);
    }
  }

  debug(message: string, data?: any, correlationId?: string): void {
    this.log(LogLevel.DEBUG, message, data, undefined, correlationId);
  }

  info(message: string, data?: any, correlationId?: string): void {
    this.log(LogLevel.INFO, message, data, undefined, correlationId);
  }

  warn(message: string, data?: any, correlationId?: string): void {
    this.log(LogLevel.WARN, message, data, undefined, correlationId);
  }

  error(message: string, error?: Error, data?: any, correlationId?: string): void {
    this.log(LogLevel.ERROR, message, data, error, correlationId);
  }
}

export const logger = new Logger('checkout-service');
