import { Request, Response, NextFunction } from 'express';
import winston from 'winston';

// Configure Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'maysar-backend' },
  transports: [
    // Write all logs with importance level of `error` or less to `error.log`
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    // Write all logs with importance level of `info` or less to `combined.log`
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// If we're not in production then log to the console with a simple format
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Generate correlation ID for request tracking
export function generateCorrelationId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Logging middleware
export const loggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const correlationId = generateCorrelationId();

  // Add correlation ID to request for use in other middleware
  (req as any).correlationId = correlationId;

  // Log incoming request
  logger.info('Request received', {
    correlationId,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    query: req.query,
    body: req.method !== 'GET' ? sanitizeRequestBody(req.body) : undefined
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    logger.info('Request completed', {
      correlationId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length')
    });
  });

  next();
};

// Sanitize sensitive data from request bodies
function sanitizeRequestBody(body: any): any {
  if (!body || typeof body !== 'object') return body;

  const sanitized = { ...body };

  // List of sensitive fields to redact
  const sensitiveFields = [
    'password', 'token', 'secret', 'key', 'creditCard', 'cvv', 'pin',
    'ssn', 'socialSecurity', 'apiKey', 'privateKey', 'accessToken'
  ];

  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized;
}

// Logger utility functions
export const createLogger = (context: string) => ({
  error: (message: string, meta?: any) => logger.error(message, { context, ...meta }),
  warn: (message: string, meta?: any) => logger.warn(message, { context, ...meta }),
  info: (message: string, meta?: any) => logger.info(message, { context, ...meta }),
  debug: (message: string, meta?: any) => logger.debug(message, { context, ...meta }),
  http: (message: string, meta?: any) => logger.http(message, { context, ...meta }),
});

// Health check endpoint
export const healthCheck = (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'maysar-backend',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime()
  });
};

// Metrics collection (basic implementation)
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = process.hrtime.bigint();

  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6; // Convert to milliseconds

    // Log metrics (in production, send to monitoring system)
    logger.info('Request metrics', {
      correlationId: (req as any).correlationId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get('User-Agent'),
      contentType: res.get('Content-Type')
    });
  });

  next();
};

export { logger };
export default logger;
