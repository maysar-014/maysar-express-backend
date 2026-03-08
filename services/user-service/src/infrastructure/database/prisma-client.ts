import { Prisma, PrismaClient } from '@prisma/client';
import { logger } from '../services/logger.service';

/**
 * Prisma client configuration for User Service
 * Handles database connections and connection pooling
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query', 'error', 'info', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * Database connection utilities
 */
export class DatabaseConnection {
  // private static isConnected = false;

  /**
   * Test database connection
   */
  static async testConnection(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      logger.info('Database connection test successful');
      return true;
    } catch (error) {
      logger.error('Database connection test failed', { error });
      return false;
    }
  }

  /**
   * Get connection status
   */
  static async getConnectionStatus() {
    try {
      const startTime = Date.now();
      await prisma.$queryRaw`SELECT 1 as health_check`;
      const responseTime = Date.now() - startTime;

      return {
        connected: true,
        responseTime: `${responseTime}ms`,
        connectionInfo: {
          database: process.env.DATABASE_URL?.split('/').pop()?.split('?')[0] || 'unknown',
          provider: 'postgresql'
        }
      };
    } catch (error: unknown) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        connectionInfo: null
      };
    }
  }

  /**
   * Initialize database connection
   */
  static async initialize(): Promise<void> {
    try {
      logger.info('Initializing database connection...');

      // Test connection
      const isConnected = await this.testConnection();
      if (!isConnected) {
        throw new Error('Failed to establish database connection');
      }

      // Run any pending migrations in development
      if (process.env.NODE_ENV === 'development') {
        logger.info('Checking for pending migrations...');
        // Note: In production, migrations should be run separately
        // await prisma.$executeRaw`-- migration commands would go here`;
      }

      logger.info('Database connection initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database connection', { error });
      throw error;
    }
  }

  /**
   * Close database connection
   */
  static async close(): Promise<void> {
    try {
      await prisma.$disconnect();
      logger.info('Database connection closed');
    } catch (error) {
      logger.error('Error closing database connection', { error });
      throw error;
    }
  }

  /**
   * Get connection health metrics
   */
  static async getHealthMetrics() {
    const status = await this.getConnectionStatus();

    return {
      status: status.connected ? 'healthy' : 'unhealthy',
      responseTime: status.responseTime,
      connectionPool: {
        active: await this.getActiveConnections(),
        idle: await this.getIdleConnections(),
        total: await this.getTotalConnections()
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get active connection count (PostgreSQL specific)
   */
  static async getActiveConnections(): Promise<number> {
    try {
      const result = await prisma.$queryRaw`
        SELECT count(*) as count
        FROM pg_stat_activity
        WHERE state = 'active' AND datname = current_database()
      ` as Array<{ count: number }>;
      return result[0]?.count || 0;
    } catch {
      return 0; // Fallback for non-PostgreSQL databases
    }
  }

  /**
   * Get idle connection count
   */
  static async getIdleConnections(): Promise<number> {
    try {
      const result = await prisma.$queryRaw`
        SELECT count(*) as count
        FROM pg_stat_activity
        WHERE state = 'idle' AND datname = current_database()
      ` as Array<{ count: number }>;
      return result[0]?.count || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Get total connection count
   */
  static async getTotalConnections(): Promise<number> {
    try {
      const result = await prisma.$queryRaw`
        SELECT count(*) as count
        FROM pg_stat_activity
        WHERE datname = current_database()
      ` as Array<{ count: number }>;
      return result[0]?.count || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Execute raw SQL with logging
   */
  static async executeRaw(query: string, _params: unknown[] = []): Promise<unknown> {
    const startTime = Date.now();
    try {
      // Use prisma.$queryRaw for actual execution
      const result = await prisma.$queryRaw`${query}`;
      const duration = Date.now() - startTime;

      logger.info('Raw query executed', { operation: 'raw_query', type: 'custom', duration, success: true });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Raw query failed', { operation: 'raw_query', type: 'custom', duration, success: false, error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Execute transaction with automatic rollback on error
   */
  static async executeTransaction<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await prisma.$transaction(callback);
      const duration = Date.now() - startTime;

      logger.info('Transaction completed', { operation: 'transaction', type: 'multiple', duration, success: true });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Transaction failed', { operation: 'transaction', type: 'multiple', duration, success: false, error: (error as Error).message });
      throw error;
    }
  }
}

// Export the configured Prisma client
export default prisma;
