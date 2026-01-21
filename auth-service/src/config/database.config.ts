/**
 * Database Configuration
 * Handles database connection settings and optimization
 */

export const databaseConfig = {
  // Connection
  url: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true',

  // Connection Pool
  maxConnections: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '20', 10),

  // Prisma Configuration
  prisma: {
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
    errorFormat: process.env.NODE_ENV === 'development' ? 'pretty' : 'colorless'
  },

  // Migration Settings
  migrations: {
    tableName: '_prisma_migrations',
    schema: 'public'
  },

  // Connection Timeout
  connectionTimeout: 10000, // 10 seconds

  // Query Timeout
  queryTimeout: 30000, // 30 seconds

  // Idle Timeout
  idleTimeout: 300000, // 5 minutes

  // Retry Configuration
  retry: {
    maxAttempts: 3,
    initialDelay: 1000, // 1 second
    maxDelay: 10000, // 10 seconds
    backoffMultiplier: 2
  }
};

/**
 * Database Health Check Configuration
 */
export const databaseHealthConfig = {
  // Health check query
  healthCheckQuery: 'SELECT 1',

  // Timeout for health checks
  healthCheckTimeout: 5000, // 5 seconds

  // Health check interval
  healthCheckInterval: 30000, // 30 seconds

  // Maximum acceptable connection latency
  maxLatencyMs: 1000, // 1 second

  // Minimum required connections in pool
  minConnectionsRequired: 1
};

/**
 * Database Monitoring Configuration
 */
export const databaseMonitoringConfig = {
  // Slow query threshold
  slowQueryThreshold: 1000, // 1 second

  // Connection pool monitoring
  poolMonitoring: {
    enabled: true,
    interval: 60000, // 1 minute
    logLevel: 'info'
  },

  // Query metrics
  queryMetrics: {
    enabled: process.env.NODE_ENV === 'production',
    collectLatency: true,
    collectCount: true,
    collectErrors: true
  }
};
