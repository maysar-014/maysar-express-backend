/**
 * Logger service for Notification Service
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

class Logger {
  private service = 'notification-service';

  error(message: string, meta?: Record<string, any>): void {
    this.log('error', message, meta);
  }

  warn(message: string, meta?: Record<string, any>): void {
    this.log('warn', message, meta);
  }

  info(message: string, meta?: Record<string, any>): void {
    this.log('info', message, meta);
  }

  debug(message: string, meta?: Record<string, any>): void {
    this.log('debug', message, meta);
  }

  log(level: LogLevel, message: string, meta?: Record<string, any>): void {
    this.logInternal(level, message, meta);
  }

  private logInternal(level: LogLevel, message: string, meta?: Record<string, any>): void {
    const payload = {
      level,
      service: this.service,
      message,
      timestamp: new Date().toISOString(),
      ...meta
    };
    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify(payload));
    } else {
      const fn = level === 'debug' ? 'log' : level;
      (console as any)[fn](message, meta ?? '');
    }
  }
}

export const logger = new Logger();
