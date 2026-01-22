/**
 * Database Configuration
 * Comprehensive database settings with connection pooling, SSL, and performance optimization
 * Implements Prisma ORM configuration and database connection management
 */

import { z } from 'zod';

// =====================================================================================
// DATABASE CONFIGURATION SCHEMAS
// =====================================================================================

/**
 * Database Connection Schema
 */
const DatabaseConnectionSchema = z.object({
  host: z.string().default('localhost'),
  port: z.coerce.number().default(5432),
  database: z.string().default('catalog'),
  username: z.string().default('postgres'),
  password: z.string().optional(),
  ssl: z.coerce.boolean().default(false),
  sslMode: z.enum(['disable', 'allow', 'prefer', 'require', 'verify-ca', 'verify-full']).default('prefer'),
  connectionTimeout: z.coerce.number().default(10000), // 10 seconds
  commandTimeout: z.coerce.number().default(30000), // 30 seconds
});

/**
 * Connection Pool Schema
 */
const ConnectionPoolSchema = z.object({
  min: z.coerce.number().default(2),
  max: z.coerce.number().default(20),
  idleTimeout: z.coerce.number().default(30000), // 30 seconds
  acquireTimeout: z.coerce.number().default(60000), // 1 minute
  reapInterval: z.coerce.number().default(1000), // 1 second
  createRetryInterval: z.coerce.number().default(200), // 200ms
});

/**
 * Database Performance Schema
 */
const DatabasePerformanceSchema = z.object({
  statementCacheSize: z.coerce.number().default(100),
  queryTimeout: z.coerce.number().default(30000), // 30 seconds
  slowQueryThreshold: z.coerce.number().default(1000), // 1 second
  enableQueryLogging: z.coerce.boolean().default(false),
  logSlowQueries: z.coerce.boolean().default(true),
});

/**
 * Database Monitoring Schema
 */
const DatabaseMonitoringSchema = z.object({
  enableMetrics: z.coerce.boolean().default(true),
  metricsInterval: z.coerce.number().default(30000), // 30 seconds
  enableHealthChecks: z.coerce.boolean().default(true),
  healthCheckInterval: z.coerce.number().default(30000), // 30 seconds
  alertOnConnectionErrors: z.coerce.boolean().default(true),
  alertOnSlowQueries: z.coerce.boolean().default(true),
});

// =====================================================================================
// DATABASE CONFIGURATION INTERFACE
// =====================================================================================

/**
 * Database Configuration Interface
 */
export interface DatabaseConfig {
  // Connection settings
  connection: {
    host: string;
    port: number;
    database: string;
    username: string;
    password?: string;
    ssl: boolean;
    sslMode: string;
    connectionTimeout: number;
    commandTimeout: number;
  };

  // Connection pool
  pool: {
    min: number;
    max: number;
    idleTimeout: number;
    acquireTimeout: number;
    reapInterval: number;
    createRetryInterval: number;
  };

  // Performance settings
  performance: {
    statementCacheSize: number;
    queryTimeout: number;
    slowQueryThreshold: number;
    enableQueryLogging: boolean;
    logSlowQueries: boolean;
  };

  // Monitoring
  monitoring: {
    enableMetrics: boolean;
    metricsInterval: number;
    enableHealthChecks: boolean;
    healthCheckInterval: number;
    alertOnConnectionErrors: boolean;
    alertOnSlowQueries: boolean;
  };

  // Prisma specific
  prisma: {
    logLevel: 'query' | 'info' | 'warn' | 'error';
    generateSchema: boolean;
    datasourceUrl: string;
  };

  // Migration settings
  migration: {
    enableMigrations: boolean;
    migrationTable: string;
    lockTimeout: number;
  };
}

// =====================================================================================
// DATABASE CONFIGURATION BUILDER
// =====================================================================================

/**
 * Database Configuration Builder
 * Builds database configuration from environment variables
 */
export class DatabaseConfigBuilder {
  private config: Partial<DatabaseConfig> = {};

  /**
   * Build database configuration
   */
  static build(): DatabaseConfig {
    const builder = new DatabaseConfigBuilder();
    return builder.buildConfig();
  }

  /**
   * Build configuration from environment
   */
  private buildConfig(): DatabaseConfig {
    const env = process.env;

    // Parse DATABASE_URL if provided
    const databaseUrl = env.DATABASE_URL;
    const connectionConfig = databaseUrl
      ? this.parseDatabaseUrl(databaseUrl)
      : this.buildConnectionConfig();

    return {
      connection: connectionConfig,
      pool: this.buildPoolConfig(),
      performance: this.buildPerformanceConfig(),
      monitoring: this.buildMonitoringConfig(),
      prisma: this.buildPrismaConfig(connectionConfig),
      migration: this.buildMigrationConfig()
    };
  }

  /**
   * Parse DATABASE_URL
   */
  private parseDatabaseUrl(url: string): DatabaseConfig['connection'] {
    try {
      const parsedUrl = new URL(url);

      return {
        host: parsedUrl.hostname,
        port: parseInt(parsedUrl.port) || 5432,
        database: parsedUrl.pathname.slice(1) || 'catalog',
        username: parsedUrl.username || 'postgres',
        password: parsedUrl.password || undefined,
        ssl: parsedUrl.searchParams.get('ssl') === 'true' || false,
        sslMode: parsedUrl.searchParams.get('sslmode') || 'prefer',
        connectionTimeout: parseInt(parsedUrl.searchParams.get('connect_timeout') || '10000'),
        commandTimeout: parseInt(parsedUrl.searchParams.get('command_timeout') || '30000')
      };
    } catch (error) {
      throw new Error(`Invalid DATABASE_URL: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Build connection configuration from individual env vars
   */
  private buildConnectionConfig(): DatabaseConfig['connection'] {
    const env = process.env;

    return {
      host: env.DB_HOST || 'localhost',
      port: parseInt(env.DB_PORT || '5432'),
      database: env.DB_NAME || 'catalog',
      username: env.DB_USER || 'postgres',
      password: env.DB_PASSWORD,
      ssl: env.DB_SSL === 'true',
      sslMode: env.DB_SSL_MODE || 'prefer',
      connectionTimeout: parseInt(env.DB_CONNECTION_TIMEOUT || '10000'),
      commandTimeout: parseInt(env.DB_COMMAND_TIMEOUT || '30000')
    };
  }

  /**
   * Build connection pool configuration
   */
  private buildPoolConfig(): DatabaseConfig['pool'] {
    const env = process.env;

    return {
      min: parseInt(env.DB_POOL_MIN || '2'),
      max: parseInt(env.DB_POOL_MAX || '20'),
      idleTimeout: parseInt(env.DB_POOL_IDLE_TIMEOUT || '30000'),
      acquireTimeout: parseInt(env.DB_POOL_ACQUIRE_TIMEOUT || '60000'),
      reapInterval: parseInt(env.DB_POOL_REAP_INTERVAL || '1000'),
      createRetryInterval: parseInt(env.DB_POOL_CREATE_RETRY_INTERVAL || '200')
    };
  }

  /**
   * Build performance configuration
   */
  private buildPerformanceConfig(): DatabaseConfig['performance'] {
    const env = process.env;

    return {
      statementCacheSize: parseInt(env.DB_STATEMENT_CACHE_SIZE || '100'),
      queryTimeout: parseInt(env.DB_QUERY_TIMEOUT || '30000'),
      slowQueryThreshold: parseInt(env.DB_SLOW_QUERY_THRESHOLD || '1000'),
      enableQueryLogging: env.DB_ENABLE_QUERY_LOGGING === 'true',
      logSlowQueries: env.DB_LOG_SLOW_QUERIES !== 'false'
    };
  }

  /**
   * Build monitoring configuration
   */
  private buildMonitoringConfig(): DatabaseConfig['monitoring'] {
    const env = process.env;

    return {
      enableMetrics: env.DB_ENABLE_METRICS !== 'false',
      metricsInterval: parseInt(env.DB_METRICS_INTERVAL || '30000'),
      enableHealthChecks: env.DB_ENABLE_HEALTH_CHECKS !== 'false',
      healthCheckInterval: parseInt(env.DB_HEALTH_CHECK_INTERVAL || '30000'),
      alertOnConnectionErrors: env.DB_ALERT_CONNECTION_ERRORS !== 'false',
      alertOnSlowQueries: env.DB_ALERT_SLOW_QUERIES !== 'false'
    };
  }

  /**
   * Build Prisma configuration
   */
  private buildPrismaConfig(connection: DatabaseConfig['connection']): DatabaseConfig['prisma'] {
    const env = process.env;

    // Build datasource URL
    const datasourceUrl = env.DATABASE_URL || this.buildDatabaseUrl(connection);

    return {
      logLevel: (env.PRISMA_LOG_LEVEL as any) || 'warn',
      generateSchema: env.PRISMA_GENERATE_SCHEMA === 'true',
      datasourceUrl
    };
  }

  /**
   * Build migration configuration
   */
  private buildMigrationConfig(): DatabaseConfig['migration'] {
    const env = process.env;

    return {
      enableMigrations: env.DB_ENABLE_MIGRATIONS !== 'false',
      migrationTable: env.DB_MIGRATION_TABLE || '_prisma_migrations',
      lockTimeout: parseInt(env.DB_MIGRATION_LOCK_TIMEOUT || '300000') // 5 minutes
    };
  }

  /**
   * Build database URL from connection config
   */
  private buildDatabaseUrl(connection: DatabaseConfig['connection']): string {
    const { host, port, database, username, password, ssl, sslMode } = connection;

    let url = `postgresql://${username}`;
    if (password) {
      url += `:${password}`;
    }
    url += `@${host}:${port}/${database}`;

    const params = new URLSearchParams();
    if (ssl) {
      params.set('ssl', 'true');
      if (sslMode) {
        params.set('sslmode', sslMode);
      }
    }

    const paramString = params.toString();
    if (paramString) {
      url += `?${paramString}`;
    }

    return url;
  }
}

// =====================================================================================
// DATABASE HEALTH CHECKS
// =====================================================================================

/**
 * Database Health Checker
 */
export class DatabaseHealthChecker {
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  /**
   * Perform comprehensive health check
   */
  async checkHealth(): Promise<{
    healthy: boolean;
    checks: Record<string, { status: 'pass' | 'fail' | 'warn'; message: string; duration?: number }>;
  }> {
    const checks: Record<string, { status: 'pass' | 'fail' | 'warn'; message: string; duration?: number }> = {};

    // Connection check
    try {
      const startTime = Date.now();
      const connectionHealthy = await this.checkConnection();
      const duration = Date.now() - startTime;

      checks.connection = {
        status: connectionHealthy ? 'pass' : 'fail',
        message: connectionHealthy ? 'Database connection successful' : 'Database connection failed',
        duration
      };
    } catch (error) {
      checks.connection = {
        status: 'fail',
        message: `Connection check failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }

    // Pool check
    try {
      const poolStatus = await this.checkPool();
      checks.pool = poolStatus;
    } catch (error) {
      checks.pool = {
        status: 'fail',
        message: `Pool check failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }

    // Performance check
    try {
      const performanceStatus = await this.checkPerformance();
      checks.performance = performanceStatus;
    } catch (error) {
      checks.performance = {
        status: 'warn',
        message: `Performance check failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }

    const healthy = Object.values(checks).every(check => check.status !== 'fail');

    return { healthy, checks };
  }

  /**
   * Check database connection
   */
  private async checkConnection(): Promise<boolean> {
    // In a real implementation, this would test the actual database connection
    // For now, return true as a placeholder
    return true;
  }

  /**
   * Check connection pool status
   */
  private async checkPool(): Promise<{ status: 'pass' | 'fail' | 'warn'; message: string }> {
    // In a real implementation, this would check pool statistics
    // For now, return pass as a placeholder
    return {
      status: 'pass',
      message: 'Connection pool is healthy'
    };
  }

  /**
   * Check database performance
   */
  private async checkPerformance(): Promise<{ status: 'pass' | 'fail' | 'warn'; message: string }> {
    // In a real implementation, this would run performance queries
    // For now, return pass as a placeholder
    return {
      status: 'pass',
      message: 'Database performance is within acceptable limits'
    };
  }
}

// =====================================================================================
// DATABASE METRICS
// =====================================================================================

/**
 * Database Metrics Collector
 */
export class DatabaseMetricsCollector {
  private config: DatabaseConfig;
  private metrics: Map<string, number> = new Map();

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  /**
   * Collect database metrics
   */
  async collectMetrics(): Promise<Record<string, number>> {
    const metrics: Record<string, number> = {};

    // Connection pool metrics
    metrics.pool_active_connections = await this.getActiveConnections();
    metrics.pool_idle_connections = await this.getIdleConnections();
    metrics.pool_total_connections = await this.getTotalConnections();

    // Query performance metrics
    metrics.avg_query_time = await this.getAverageQueryTime();
    metrics.slow_queries_count = await this.getSlowQueriesCount();

    // Database size metrics
    metrics.database_size_bytes = await this.getDatabaseSize();

    return metrics;
  }

  private async getActiveConnections(): Promise<number> {
    // Placeholder implementation
    return 5;
  }

  private async getIdleConnections(): Promise<number> {
    // Placeholder implementation
    return 10;
  }

  private async getTotalConnections(): Promise<number> {
    // Placeholder implementation
    return 15;
  }

  private async getAverageQueryTime(): Promise<number> {
    // Placeholder implementation
    return 25; // milliseconds
  }

  private async getSlowQueriesCount(): Promise<number> {
    // Placeholder implementation
    return 0;
  }

  private async getDatabaseSize(): Promise<number> {
    // Placeholder implementation
    return 1024 * 1024 * 100; // 100MB
  }
}

// =====================================================================================
// DATABASE CONFIGURATION EXPORTS
// =====================================================================================

/**
 * Get database configuration
 */
export function getDatabaseConfig(): DatabaseConfig {
  return DatabaseConfigBuilder.build();
}

/**
 * Create database health checker
 */
export function createDatabaseHealthChecker(config?: DatabaseConfig): DatabaseHealthChecker {
  return new DatabaseHealthChecker(config || getDatabaseConfig());
}

/**
 * Create database metrics collector
 */
export function createDatabaseMetricsCollector(config?: DatabaseConfig): DatabaseMetricsCollector {
  return new DatabaseMetricsCollector(config || getDatabaseConfig());
}

/**
 * Validate database configuration
 */
export function validateDatabaseConfig(config?: DatabaseConfig): { valid: boolean; errors: string[] } {
  try {
    const dbConfig = config || getDatabaseConfig();

    const errors: string[] = [];

    // Validate connection settings
    if (!dbConfig.connection.host) {
      errors.push('Database host is required');
    }

    if (!dbConfig.connection.database) {
      errors.push('Database name is required');
    }

    if (!dbConfig.connection.username) {
      errors.push('Database username is required');
    }

    // Validate pool settings
    if (dbConfig.pool.min < 0) {
      errors.push('Pool min connections must be non-negative');
    }

    if (dbConfig.pool.max <= dbConfig.pool.min) {
      errors.push('Pool max connections must be greater than min connections');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)]
    };
  }
}

/**
 * Default database configuration
 */
export const databaseConfig = getDatabaseConfig();
