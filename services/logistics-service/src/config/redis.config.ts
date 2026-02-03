import { createClient, RedisClientType } from 'redis';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  maxRetries: number;
  retryDelay: number;
  connectTimeout: number;
  commandTimeout: number;
}

export class RedisConfiguration {
  private static instance: RedisConfiguration;
  private config: RedisConfig;
  private client: RedisClientType | null = null;

  private constructor() {
    this.config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      maxRetries: parseInt(process.env.REDIS_MAX_RETRIES || '3'),
      retryDelay: parseInt(process.env.REDIS_RETRY_DELAY || '1000'),
      connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '10000'),
      commandTimeout: parseInt(process.env.REDIS_COMMAND_TIMEOUT || '5000')
    };
  }

  static getInstance(): RedisConfiguration {
    if (!RedisConfiguration.instance) {
      RedisConfiguration.instance = new RedisConfiguration();
    }
    return RedisConfiguration.instance;
  }

  getConfig(): RedisConfig {
    return this.config;
  }

  async createClient(): Promise<RedisClientType> {
    if (this.client) {
      return this.client;
    }

    this.client = createClient({
      socket: {
        host: this.config.host,
        port: this.config.port,
        connectTimeout: this.config.connectTimeout
      },
      password: this.config.password,
      database: this.config.db
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    this.client.on('connect', () => {
      console.log('Redis Client Connected');
    });

    await this.client.connect();
    return this.client;
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.client) {
        await this.createClient();
      }
      await this.client!.ping();
      return true;
    } catch (error) {
      console.error('Redis connection test failed:', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
      this.client = null;
    }
  }
}