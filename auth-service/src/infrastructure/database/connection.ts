import { prisma } from './prisma-client';
import { config } from '../../config';
import { logger } from '../services/logger.service';

/**
 * Database Connection Management
 * Handles database initialization, health checks, and connection lifecycle
 */

let isConnected = false;
let connectionAttempts = 0;
const maxConnectionAttempts = config.database.retry.maxAttempts;

/**
 * Initialize database connection
 */
export async function initializeDatabase(): Promise<void> {
  logger.info('Initializing database connection...');

  try {
    // Test connection
    await testConnection();

    // Run any pending migrations in development
    if (config.isDevelopment) {
      await runMigrationsIfNeeded();
    }

    isConnected = true;
    connectionAttempts = 0;

    logger.info('✅ Database connection established successfully');

    // Log connection info
    const connectionInfo = await prisma.getConnectionInfo();
    logger.info('📊 Database connection info:', connectionInfo);

  } catch (error) {
    connectionAttempts++;
    logger.error(`Database connection attempt ${connectionAttempts} failed:`, error);

    if (connectionAttempts < maxConnectionAttempts) {
      const delay = config.database.retry.initialDelay * Math.pow(config.database.retry.backoffMultiplier, connectionAttempts - 1);
      logger.info(`Retrying database connection in ${delay}ms...`);

      await new Promise(resolve => setTimeout(resolve, delay));
      return initializeDatabase();
    }

    throw new Error(`Failed to connect to database after ${maxConnectionAttempts} attempts`);
  }
}

/**
 * Test database connection
 */
async function testConnection(): Promise<void> {
  const healthCheck = await prisma.healthCheck();

  if (healthCheck.status !== 'healthy') {
    throw new Error(`Database health check failed: ${healthCheck.status}`);
  }

  // Additional connection validation
  try {
    // Test basic query
    await prisma.$queryRaw`SELECT version()`;
  } catch (error) {
    throw new Error(`Database query test failed: ${error}`);
  }
}

/**
 * Run database migrations if needed (development only)
 */
async function runMigrationsIfNeeded(): Promise<void> {
  try {
    // In production, migrations should be run separately
    // This is just for development convenience
    logger.info('Checking for pending migrations...');
    // Note: In a real implementation, you might check migration status
    // and run migrations programmatically if needed
  } catch (error) {
    logger.warn('Migration check failed (this is normal in some environments):', error);
  }
}

/**
 * Check database health
 */
export async function checkDatabaseHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  details: any;
}> {
  try {
    const healthCheck = await prisma.healthCheck();
    const connectionInfo = await prisma.getConnectionInfo();

    const status = healthCheck.status === 'healthy' ? 'healthy' : 'unhealthy';

    return {
      status,
      latency: healthCheck.latency,
      details: {
        timestamp: healthCheck.timestamp,
        connectionInfo
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latency: 0,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      }
    };
  }
}

/**
 * Get database metrics
 */
export async function getDatabaseMetrics(): Promise<{
  connections: {
    active: number;
    idle: number;
    total: number;
  };
  performance: {
    averageLatency: number;
    slowQueries: number;
  };
  uptime: number;
}> {
  try {
    const connectionInfo = await prisma.getConnectionInfo();

    return {
      connections: {
        active: connectionInfo.activeConnections,
        idle: connectionInfo.idleConnections,
        total: connectionInfo.totalConnections
      },
      performance: {
        averageLatency: 0, // Would need query logging to track
        slowQueries: 0     // Would need query analysis
      },
      uptime: process.uptime()
    };
  } catch (error) {
    logger.error('Failed to get database metrics:', error);
    return {
      connections: { active: 0, idle: 0, total: 0 },
      performance: { averageLatency: 0, slowQueries: 0 },
      uptime: process.uptime()
    };
  }
}

/**
 * Close database connection
 */
export async function closeDatabaseConnection(): Promise<void> {
  try {
    await prisma.$disconnect();
    isConnected = false;
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection:', error);
    throw error;
  }
}

/**
 * Check if database is connected
 */
export function isDatabaseConnected(): boolean {
  return isConnected;
}

/**
 * Execute raw SQL query (for maintenance/admin operations)
 */
export async function executeRawQuery(query: string, params?: any[]): Promise<any> {
  try {
    if (params && params.length > 0) {
      return await prisma.$queryRawUnsafe(query, ...params);
    } else {
      return await prisma.$queryRawUnsafe(query);
    }
  } catch (error) {
    logger.error('Raw query execution failed:', { query, error });
    throw error;
  }
}

/**
 * Get database schema information
 */
export async function getDatabaseSchema(): Promise<{
  tables: string[];
  version: string;
}> {
  try {
    // Get table names
    const tablesResult = await prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    const tables = tablesResult.map(row => row.table_name);

    // Get PostgreSQL version
    const versionResult = await prisma.$queryRaw<{ version: string }[]>`
      SELECT version()
    `;

    const version = versionResult[0]?.version || 'Unknown';

    return { tables, version };
  } catch (error) {
    logger.error('Failed to get database schema:', error);
    return { tables: [], version: 'Unknown' };
  }
}
