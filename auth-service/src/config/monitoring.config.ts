/**
 * Monitoring and Observability Configuration
 * Handles logging, metrics, and alerting settings
 */

export const monitoringConfig = {
  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
    file: {
      enabled: process.env.NODE_ENV === 'production',
      path: process.env.LOG_FILE_PATH || './logs/auth-service.log',
      maxSize: '10m',
      maxFiles: '5',
      compress: true
    },
    console: {
      enabled: process.env.NODE_ENV !== 'production',
      colorize: true,
      timestamp: true
    },
    structured: {
      enabled: true,
      serviceName: 'auth-service',
      version: process.env.npm_package_version || '1.0.0'
    }
  },

  // Metrics Configuration
  metrics: {
    enabled: process.env.METRICS_ENABLED !== 'false',
    prefix: 'auth_service_',
    labels: {
      service: 'auth-service',
      environment: process.env.NODE_ENV || 'development'
    },
    buckets: {
      httpRequestDuration: [0.1, 0.5, 1, 2, 5, 10],
      databaseQueryDuration: [0.01, 0.05, 0.1, 0.5, 1, 2],
      redisOperationDuration: [0.001, 0.005, 0.01, 0.05, 0.1]
    }
  },

  // Health Check Configuration
  healthCheck: {
    enabled: process.env.HEALTH_CHECK_ENABLED !== 'false',
    interval: 30000, // 30 seconds
    timeout: 5000, // 5 seconds
    unhealthyThreshold: 3,
    healthyThreshold: 2
  },

  // Alerting Configuration
  alerting: {
    enabled: process.env.NODE_ENV === 'production',
    slack: {
      webhookUrl: process.env.SLACK_WEBHOOK_URL,
      channel: '#auth-service-alerts',
      username: 'Auth Service Monitor'
    },
    email: {
      enabled: false,
      recipients: [process.env.ADMIN_EMAIL].filter(Boolean),
      smtp: {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true'
      }
    },
    thresholds: {
      errorRate: 0.05, // 5% error rate
      responseTime: 2000, // 2 seconds average
      databaseConnections: 0.8, // 80% connection pool usage
      memoryUsage: 0.9 // 90% memory usage
    }
  },

  // Performance Monitoring
  performance: {
    enabled: process.env.NODE_ENV === 'production',
    slowQueryThreshold: 1000, // 1 second
    memoryMonitoring: {
      enabled: true,
      interval: 60000, // 1 minute
      gcMetrics: true
    },
    eventLoopMonitoring: {
      enabled: true,
      interval: 1000, // 1 second
      delayThreshold: 10 // 10ms
    }
  },

  // Business Metrics
  businessMetrics: {
    enabled: true,
    userActivity: {
      enabled: true,
      interval: 300000 // 5 minutes
    },
    securityEvents: {
      enabled: true,
      realTimeAlerts: true
    },
    authenticationMetrics: {
      enabled: true,
      successRate: true,
      responseTime: true,
      geographicalDistribution: false
    }
  },

  // APM (Application Performance Monitoring)
  apm: {
    enabled: process.env.APM_ENABLED === 'true',
    serviceName: 'auth-service',
    serviceVersion: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    captureBody: process.env.NODE_ENV === 'development' ? 'all' : 'errors',
    captureHeaders: true,
    captureErrorLogStackTraces: 'always',
    metricsInterval: 30000 // 30 seconds
  },

  // Distributed Tracing
  tracing: {
    enabled: process.env.APM_ENABLED === 'true',
    serviceName: 'auth-service',
    sampler: {
      type: 'probabilistic',
      param: 0.1 // 10% sampling rate
    },
    reporter: {
      agentHost: 'localhost',
      agentPort: 6832
    }
  },

  // Error Tracking
  errorTracking: {
    enabled: process.env.NODE_ENV === 'production',
    captureUnhandledRejections: true,
    captureUncaughtExceptions: true,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.npm_package_version || '1.0.0',
    ignoreErrors: [
      'ValidationError',
      'UnauthorizedError',
      'NotFoundError'
    ]
  }
};

/**
 * Log Levels Configuration
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  TRACE = 'trace'
}

/**
 * Metric Types
 */
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary'
}

/**
 * Alert Severity Levels
 */
export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Monitoring Event Types
 */
export enum MonitoringEventType {
  // Application Events
  APP_STARTUP = 'app_startup',
  APP_SHUTDOWN = 'app_shutdown',
  CONFIGURATION_LOADED = 'configuration_loaded',

  // Health Events
  HEALTH_CHECK_SUCCESS = 'health_check_success',
  HEALTH_CHECK_FAILURE = 'health_check_failure',
  DEPENDENCY_DOWN = 'dependency_down',
  DEPENDENCY_RECOVERED = 'dependency_recovered',

  // Performance Events
  SLOW_QUERY_DETECTED = 'slow_query_detected',
  HIGH_MEMORY_USAGE = 'high_memory_usage',
  HIGH_CPU_USAGE = 'high_cpu_usage',
  EVENT_LOOP_BLOCKED = 'event_loop_blocked',

  // Security Events
  BRUTE_FORCE_DETECTED = 'brute_force_detected',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',

  // Business Events
  USER_REGISTRATION_SPIKE = 'user_registration_spike',
  AUTHENTICATION_FAILURE_SPIKE = 'authentication_failure_spike',
  SYSTEM_LOAD_HIGH = 'system_load_high'
}

/**
 * Monitoring Thresholds
 */
export const monitoringThresholds = {
  // Response Time Thresholds (milliseconds)
  responseTime: {
    warning: 500,
    critical: 2000,
    max: 10000
  },

  // Error Rate Thresholds (percentage)
  errorRate: {
    warning: 0.01, // 1%
    critical: 0.05, // 5%
    max: 0.10 // 10%
  },

  // Resource Usage Thresholds (percentage)
  resourceUsage: {
    memory: {
      warning: 0.75, // 75%
      critical: 0.90, // 90%
      max: 0.95 // 95%
    },
    cpu: {
      warning: 0.70, // 70%
      critical: 0.85, // 85%
      max: 0.95 // 95%
    },
    disk: {
      warning: 0.80, // 80%
      critical: 0.90, // 90%
      max: 0.95 // 95%
    }
  },

  // Connection Pool Thresholds
  connectionPool: {
    usage: {
      warning: 0.70, // 70%
      critical: 0.85, // 85%
      max: 0.95 // 95%
    },
    waitTime: {
      warning: 100, // 100ms
      critical: 500, // 500ms
      max: 2000 // 2 seconds
    }
  },

  // Queue Thresholds
  queue: {
    length: {
      warning: 100,
      critical: 500,
      max: 1000
    },
    processingTime: {
      warning: 1000, // 1 second
      critical: 5000, // 5 seconds
      max: 30000 // 30 seconds
    }
  }
};
