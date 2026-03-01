import { PrismaClient } from '@prisma/client';
import { DatabaseConfiguration } from '../../config/database.config';

export class PrismaClientManager {
  private static instance: PrismaClientManager;
  private client: PrismaClient | null = null;
  private isConnected = false;

  private constructor() {}

  static getInstance(): PrismaClientManager {
    if (!PrismaClientManager.instance) {
      PrismaClientManager.instance = new PrismaClientManager();
    }
    return PrismaClientManager.instance;
  }

  getClient(): PrismaClient {
    if (!this.client) {
      throw new Error('Prisma client not initialized. Call connect() first.');
    }
    return this.client;
  }

  async getClientAsync(): Promise<PrismaClient> {
    if (!this.client) {
      await this.connect();
    }
    return this.client!;
  }

  async connect(): Promise<void> {
    if (this.isConnected && this.client) {
      return;
    }

    const dbConfig = DatabaseConfiguration.getInstance();
    this.client = dbConfig.createPrismaClient();

    try {
      await this.client.$connect();
      this.isConnected = true;
      console.log('✅ Database connected successfully');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.$disconnect();
      this.client = null;
      this.isConnected = false;
      console.log('✅ Database disconnected');
    }
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency: number }> {
    const startTime = Date.now();
    
    try {
      if (!this.client) {
        await this.connect();
      }
      
      await this.client!.$queryRaw`SELECT 1`;
      const latency = Date.now() - startTime;
      
      return {
        status: 'healthy',
        latency
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: Date.now() - startTime
      };
    }
  }

  isHealthy(): boolean {
    return this.isConnected && this.client !== null;
  }
}