import { appConfig } from './index';

/**
 * Monitoring Configuration Module
 * Handles all monitoring, logging, and observability configurations
 */

export interface LoggingConfig {
  enabled: boolean;
  level: 'error' | 'warn' | 'info' | 'debug';
  format: 'json' | 'simple';
  timestamp: boolean;
  colorize: boolean;
  transports: {
    console: boolean;
    file: boolean;
    filePath?: string;
    maxFiles?: number;
    maxSize?: string;
  };
}

export interface MetricsConfig {
  enabled: boolean;
  port: number;
  path: string;
  collectDefaultMetrics: boolean;
  customMetrics: {
    httpRequests: boolean;
    responseTime: boolean;
    databaseConnections: boolean;
    errorRate: boolean;
  };
}

export interface HealthCheckConfig {
  enabled: boolean;
  interval: number;
  timeout: number;
  unhealthyThreshold: number;
  checks: {
    database: boolean;
    redis: boolean;
    externalServices: boolean;
  };
}

export interface TracingConfig {
  enabled: boolean;
  serviceName: string;
  serviceVersion: string;
  exporter: {
    type: 'console' | 'jaeger' | 'zipkin';
    endpoint?: string;
  };
  sampling: {
    rate: number;
  };
}

export interface CacheConfig {
  enabled: boolean;
  defaultTTL: number; // seconds
  maxMemory: string; // e.g., '512mb'
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
    keyPrefix?: string;
  };
  strategies: {
    cacheAside: boolean;
    writeThrough: boolean;
    writeBehind: boolean;
  };
}

export interface AlertingConfig {
  enabled: boolean;
  rules: {
    errorRate: {
      enabled: boolean;
      threshold: number; // percentage
      window: number; // minutes
    };
    responseTime: {
      enabled: boolean;
      threshold: number; // milliseconds
      percentile: number; // 95, 99, etc.
    };
    databaseConnections: {
      enabled: boolean;
      maxConnections: number;
    };
  };
  channels: {
    console: boolean;
    webhook?: {
      url: string;
      headers?: Record<string, string>;
    };
  };
}

function parseRedisUrl(redisUrl?: string): { host: string; port: number; password?: string; db?: number } | null {
  if (!redisUrl) return null;
  try {
    const url = new URL(redisUrl);
    const db = url.pathname ? parseInt(url.pathname.replace('/', ''), 10) : undefined;
    return {
      host: url.hostname,
      port: url.port ? parseInt(url.port, 10) : 6379,
      password: url.password || undefined,
      db: Number.isNaN(db) ? undefined : db
    };
  } catch {
    return null;
  }
}

// Load logging configuration
function loadLoggingConfig(): LoggingConfig {
  return {
    enabled: true,
    level: appConfig.monitoring.logLevel as 'error' | 'warn' | 'info' | 'debug',
    format: appConfig.monitoring.logFormat as 'json' | 'simple',
    timestamp: true,
    colorize: appConfig.env.NODE_ENV === 'development',
    transports: {
      console: true,
      file: appConfig.env.NODE_ENV === 'production',
      filePath: './logs/order-service.log',
      maxFiles: 30,
      maxSize: '20m',
    },
  };
}

// Load metrics configuration
function loadMetricsConfig(): MetricsConfig {
  return {
    enabled: appConfig.monitoring.metrics.enabled,
    port: appConfig.monitoring.metrics.port,
    path: '/metrics',
    collectDefaultMetrics: true,
    customMetrics: {
      httpRequests: true,
      responseTime: true,
      databaseConnections: true,
      errorRate: true,
    },
  };
}

// Load health check configuration
function loadHealthCheckConfig(): HealthCheckConfig {
  return {
    enabled: appConfig.monitoring.healthChecks.enabled,
    interval: appConfig.monitoring.healthChecks.interval,
    timeout: 5000, // 5 seconds
    unhealthyThreshold: 3,
    checks: {
      database: true,
      redis: appConfig.features.caching,
      externalServices: !!appConfig.env.PAYMENT_GATEWAY_API_URL,
    },
  };
}

// Load tracing configuration
function loadTracingConfig(): TracingConfig {
  return {
    enabled: false, // Will be enabled in Phase 4
    serviceName: 'order-service',
    serviceVersion: '1.0.0',
    exporter: {
      type: 'console',
    },
    sampling: {
      rate: 0.1, // 10% sampling
    },
  };
}

// Load cache configuration
function loadCacheConfig(): CacheConfig {
  const redisFromUrl = parseRedisUrl(appConfig.env.REDIS_URL);
  return {
    enabled: appConfig.features.caching,
    defaultTTL: 3600, // 1 hour
    maxMemory: '512mb',
    redis: {
      host: redisFromUrl?.host || appConfig.env.REDIS_HOST || 'localhost',
      port: redisFromUrl?.port || parseInt(appConfig.env.REDIS_PORT || '6379'),
      password: redisFromUrl?.password || appConfig.env.REDIS_PASSWORD,
      db: redisFromUrl?.db ?? parseInt(appConfig.env.REDIS_DB || '0'),
      keyPrefix: 'order_service:',
    },
    strategies: {
      cacheAside: true,
      writeThrough: false,
      writeBehind: false,
    },
  };
}

// Load alerting configuration
function loadAlertingConfig(): AlertingConfig {
  return {
    enabled: false, // Will be enabled in Phase 4
    rules: {
      errorRate: {
        enabled: true,
        threshold: 5, // 5% error rate
        window: 5, // 5 minutes
      },
      responseTime: {
        enabled: true,
        threshold: 2000, // 2 seconds
        percentile: 95,
      },
      databaseConnections: {
        enabled: true,
        maxConnections: 90, // 90% of max connections
      },
    },
    channels: {
      console: true,
    },
  };
}

// Export configuration instances
export const loggingConfig = loadLoggingConfig();
export const metricsConfig = loadMetricsConfig();
export const healthCheckConfig = loadHealthCheckConfig();
export const cacheConfig = loadCacheConfig();
export const tracingConfig = loadTracingConfig();
export const alertingConfig = loadAlertingConfig();

// Monitoring utilities
export function shouldLogLevel(level: string): boolean {
  const levels = ['error', 'warn', 'info', 'debug'];
  const currentIndex = levels.indexOf(loggingConfig.level);
  const messageIndex = levels.indexOf(level);
  return messageIndex <= currentIndex;
}

export function formatLogMessage(level: string, message: string, meta?: any): string {
  const timestamp = new Date().toISOString();
  const service = 'order-service';

  if (loggingConfig.format === 'json') {
    return JSON.stringify({
      timestamp,
      service,
      level,
      message,
      ...meta,
    });
  } else {
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${service} ${level.toUpperCase()}: ${message}${metaStr}`;
  }
}

export function isHealthy(status: 'healthy' | 'unhealthy' | 'degraded'): boolean {
  return status === 'healthy';
}

export function shouldAlert(metric: string, value: number): boolean {
  if (!alertingConfig.enabled) return false;

  switch (metric) {
    case 'errorRate':
      return alertingConfig.rules.errorRate.enabled &&
             value > alertingConfig.rules.errorRate.threshold;
    case 'responseTime':
      return alertingConfig.rules.responseTime.enabled &&
             value > alertingConfig.rules.responseTime.threshold;
    case 'databaseConnections':
      return alertingConfig.rules.databaseConnections.enabled &&
             value > alertingConfig.rules.databaseConnections.maxConnections;
    default:
      return false;
  }
}

// Log monitoring configuration summary
export function logMonitoringConfigSummary(): void {
  const { appLogger } = require('../infrastructure/monitoring/logger');
  appLogger.info('Monitoring Configuration', {
    logging: `${loggingConfig.enabled ? 'Enabled' : 'Disabled'} (${loggingConfig.level})`,
    metrics: `${metricsConfig.enabled ? 'Enabled' : 'Disabled'} (port: ${metricsConfig.port})`,
    healthChecks: healthCheckConfig.enabled ? 'Enabled' : 'Disabled',
    tracing: tracingConfig.enabled ? 'Enabled' : 'Disabled',
    alerting: alertingConfig.enabled ? 'Enabled' : 'Disabled',
  });
}

