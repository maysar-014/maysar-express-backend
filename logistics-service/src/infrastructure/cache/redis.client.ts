import { RedisClientType } from 'redis';
import { RedisConfiguration } from '../../config/redis.config';

export class RedisClientManager {
  private static instance: RedisClientManager;
  private client: RedisClientType | null = null;
  private isConnected = false;

  private constructor() {}

  static getInstance(): RedisClientManager {
    if (!RedisClientManager.instance) {
      RedisClientManager.instance = new RedisClientManager();
    }
    return RedisClientManager.instance;
  }

  async getClient(): Promise<RedisClientType> {
    if (!this.client || !this.isConnected) {
      await this.connect();
    }
    return this.client!;
  }

  async connect(): Promise<void> {
    if (this.isConnected && this.client) {
      return;
    }

    const redisConfig = RedisConfiguration.getInstance();
    this.client = await redisConfig.createClient();
    this.isConnected = true;
    console.log('✅ Redis connected successfully');
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
      this.client = null;
      this.isConnected = false;
      console.log('✅ Redis disconnected');
    }
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency: number }> {
    const startTime = Date.now();
    
    try {
      if (!this.client || !this.isConnected) {
        await this.connect();
      }
      
      await this.client!.ping();
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

  async set(key: string, value: string, ttl?: number): Promise<void> {
    const client = await this.getClient();
    if (ttl) {
      await client.setEx(key, ttl, value);
    } else {
      await client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    const client = await this.getClient();
    return await client.get(key);
  }

  async del(key: string): Promise<void> {
    const client = await this.getClient();
    await client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const client = await this.getClient();
    return (await client.exists(key)) === 1;
  }

  isHealthy(): boolean {
    return this.isConnected && this.client !== null;
  }
}