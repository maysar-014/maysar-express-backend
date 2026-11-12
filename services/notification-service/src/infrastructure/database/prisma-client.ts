import { PrismaClient } from '@prisma/client';
import { logger } from '../services/logger.service';
import { createPrismaClient } from '@shared/database/prisma-client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  createPrismaClient({
    log: ['warn', 'error']
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export class DatabaseConnection {
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

  static async getConnectionStatus(): Promise<{
    connected: boolean;
    responseTime?: string;
    connectionInfo?: { database: string; provider: string } | null;
    error?: string;
  }> {
    try {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1 as health_check`;
      const responseTime = `${Date.now() - start}ms`;
      return {
        connected: true,
        responseTime,
        connectionInfo: {
          database: process.env.DATABASE_URL?.split('/').pop()?.split('?')[0] || 'unknown',
          provider: 'postgresql'
        }
      };
    } catch (err: any) {
      return {
        connected: false,
        error: err?.message,
        connectionInfo: null
      };
    }
  }

  static async initialize(): Promise<void> {
    try {
      logger.info('Initializing database connection...');
      const ok = await this.testConnection();
      if (!ok) throw new Error('Failed to establish database connection');
      logger.info('Database connection initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database connection', { error });
      throw error;
    }
  }

  static async close(): Promise<void> {
    try {
      await prisma.$disconnect();
      logger.info('Database connection closed');
    } catch (error) {
      logger.error('Error closing database connection', { error });
      throw error;
    }
  }
}

export default prisma;
