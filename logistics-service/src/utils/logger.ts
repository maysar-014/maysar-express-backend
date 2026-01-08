import winston from 'winston';
import { AppConfiguration } from '../config/app.config';

export interface LogContext {
  requestId?: string;
  userId?: string;
  courierId?: string;
  deliveryId?: string;
  orderId?: string;
  [key: string]: any;
}

export class Logger {
  private static instance: Logger;
  private logger: winston.Logger;

  private constructor() {
    const appConfig = AppConfiguration.getInstance().getConfig();
    
    const formats = [
      winston.format.timestamp(),
      winston.format.errors({ stack: true })
    ];

    if (appConfig.logging.format === 'json') {
      formats.push(winston.format.json());
    } else {
      formats.push(winston.format.simple());
    }

    this.logger = winston.createLogger({
      level: appConfig.logging.level,
      format: winston.format.combine(...formats),
      defaultMeta: {
        service: appConfig.serviceName,
        version: appConfig.version,
        environment: appConfig.environment
      },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ]
    });
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  info(message: string, context?: LogContext): void {
    this.logger.info(message, context);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.logger.error(message, { error: error?.stack, ...context });
  }

  warn(message: string, context?: LogContext): void {
    this.logger.warn(message, context);
  }

  debug(message: string, context?: LogContext): void {
    this.logger.debug(message, context);
  }

  logRequest(method: string, url: string, statusCode: number, responseTime: number, context?: LogContext): void {
    this.info(`${method} ${url} ${statusCode} - ${responseTime}ms`, {
      type: 'request',
      method,
      url,
      statusCode,
      responseTime,
      ...context
    });
  }
}