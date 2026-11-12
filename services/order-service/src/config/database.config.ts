import { PrismaClient } from '@prisma/client';
import logger from '../infrastructure/monitoring/logger';
import { createPrismaClient } from '@shared/database/prisma-client';

export interface DatabaseConfig {
  prisma: {
    url: string;
    maxConnections: number;
    logQueries: boolean;
  };
}

export class DatabaseManager {
  private static instance: DatabaseManager;
  private prismaClient: PrismaClient | null = null;

  private constructor() {}

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  async initialize(config: DatabaseConfig): Promise<void> {
    if (this.prismaClient) {
      return;
    }

    try {
      logger.info('Connecting to database...');

      // Reuse the global Prisma singleton to avoid exhausting the connection pool
      // in the monolith where 21+ services each create their own PrismaClient.
      const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };
      if (globalForPrisma.prisma) {
        this.prismaClient = globalForPrisma.prisma;
        logger.info('Reusing global Prisma singleton for order-service');
        return;
      }

      this.prismaClient = createPrismaClient({
        datasourceUrl: config.prisma.url,
        log: ['warn', 'error'],
      });

      await Promise.race([
        this.prismaClient.$connect(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Prisma connection timeout')), 30000)
        ),
      ]);

      globalForPrisma.prisma = this.prismaClient;
      logger.info('Prisma database connected successfully');
    } catch (error) {
      this.prismaClient = null;
      const err = error as Error;
      logger.error('Database initialization failed:', err.message);
      throw new Error(`Database initialization failed: ${err.message}`);
    }
  }

  getPrisma(): PrismaClient {
    if (!this.prismaClient) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.prismaClient;
  }

  async disconnect(): Promise<void> {
    try {
      if (this.prismaClient) {
        await this.prismaClient.$disconnect();
        this.prismaClient = null;
        logger.info('Prisma database disconnected');
      }
    } catch (error) {
      logger.error('Error disconnecting from database:', error);
    }
  }

  async healthCheck(): Promise<{
    prisma: boolean;
    details: Record<string, unknown>;
  }> {
    const results = {
      prisma: false,
      details: {} as Record<string, unknown>,
    };

    try {
      if (!this.prismaClient) {
        results.details.prisma = { status: 'unhealthy', error: 'Client not initialized' };
        return results;
      }

      const startTime = Date.now();
      await this.prismaClient.$queryRaw`SELECT 1`;
      results.prisma = true;
      results.details.prisma = {
        status: 'healthy',
        latency: Date.now() - startTime,
      };
    } catch (error) {
      results.details.prisma = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    return results;
  }
}

export const databaseManager = DatabaseManager.getInstance();

export function loadDatabaseConfig(): DatabaseConfig {
  const config: DatabaseConfig = {
    prisma: {
      url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/order_service',
      maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10', 10),
    logQueries: false,
    },
  };

  if (!config.prisma.url) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  return config;
}