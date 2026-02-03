import { PrismaClient } from '@prisma/client';
import { config } from '../../config';

/**
 * Prisma Client Configuration
 * Singleton instance with connection pooling and error handling
 */

// Extend PrismaClient for custom methods
class ExtendedPrismaClient extends PrismaClient {
  constructor() {
    super({
      log: config.database.prisma.log,
      errorFormat: config.database.prisma.errorFormat,
    });
  }

  /**
   * Health check method
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    latency: number;
    timestamp: Date;
  }> {
    const startTime = Date.now();

    try {
      await this.$queryRaw`SELECT 1`;
      const latency = Date.now() - startTime;

      return {
        status: 'healthy',
        latency,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Database health check failed:', error);
      return {
        status: 'unhealthy',
        latency: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }

  /**
   * Get connection info
   */
  async getConnectionInfo(): Promise<{
    activeConnections: number;
    idleConnections: number;
    totalConnections: number;
  }> {
    try {
      // This is a simplified version - in production you might use
      // database-specific queries to get connection pool stats
      const result = await this.$queryRaw<{ count: number }[]>`
        SELECT count(*) as count FROM pg_stat_activity
        WHERE datname = current_database()
      `;

      return {
        activeConnections: result[0]?.count || 0,
        idleConnections: 0, // Would need more complex query
        totalConnections: result[0]?.count || 0
      };
    } catch (error) {
      console.error('Failed to get connection info:', error);
      return {
        activeConnections: 0,
        idleConnections: 0,
        totalConnections: 0
      };
    }
  }
}

// Create singleton instance
const prismaClient = new ExtendedPrismaClient();

// Handle connection events (simplified - Prisma handles most internally)

// Graceful shutdown
process.on('beforeExit', async () => {
  await prismaClient.$disconnect();
});

process.on('SIGINT', async () => {
  await prismaClient.$disconnect();
});

process.on('SIGTERM', async () => {
  await prismaClient.$disconnect();
});

export { prismaClient as prisma };
export default prismaClient;
