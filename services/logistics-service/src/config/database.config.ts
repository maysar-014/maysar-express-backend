import { PrismaClient } from '@prisma/client';
import { createPrismaClient } from '@shared/database/prisma-client';

export interface DatabaseConfig {
  url: string;
  maxConnections: number;
  connectionTimeout: number;
  queryTimeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export class DatabaseConfiguration {
  private static instance: DatabaseConfiguration;
  private config: DatabaseConfig;

  private constructor() {
    this.config = {
      url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/logistics',
      maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
      connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),
      queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT || '30000'),
      retryAttempts: parseInt(process.env.DB_RETRY_ATTEMPTS || '3'),
      retryDelay: parseInt(process.env.DB_RETRY_DELAY || '1000')
    };
  }

  static getInstance(): DatabaseConfiguration {
    if (!DatabaseConfiguration.instance) {
      DatabaseConfiguration.instance = new DatabaseConfiguration();
    }
    return DatabaseConfiguration.instance;
  }

  getConfig(): DatabaseConfig {
    return this.config;
  }

  createPrismaClient(): PrismaClient {
    return createPrismaClient({
      datasources: {
        db: {
          url: this.config.url
        }
      },
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error']
    });
  }

  async testConnection(client: PrismaClient): Promise<boolean> {
    try {
      await client.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }
}