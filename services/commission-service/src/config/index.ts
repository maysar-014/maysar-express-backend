/**
 * Configuration Management
 * Environment variables and application settings
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration interface
export interface AppConfig {
  server: {
    port: number;
    env: string;
    corsOrigin: string;
  };
  database: {
    url: string;
  };
  kafka?: {
    brokers: string[];
    clientId: string;
  };
  redis?: {
    host: string;
    port: number;
    password?: string;
  };
  payment?: {
    provider: string;
    apiKey: string;
    baseUrl: string;
  };
  logging: {
    level: string;
  };
  monitoring: {
    enabled: boolean;
    healthCheckInterval: number;
  };
}

// Default configuration
const defaultConfig: AppConfig = {
  server: {
    port: parseInt(process.env.PORT || '3008', 10),
    env: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.CORS_ORIGIN || '*'
  },
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/commission_db'
  },
  kafka: process.env.KAFKA_BROKERS ? {
    brokers: process.env.KAFKA_BROKERS.split(','),
    clientId: process.env.KAFKA_CLIENT_ID || 'commission-service'
  } : undefined,
  redis: process.env.REDIS_HOST ? {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD
  } : undefined,
  payment: process.env.PAYMENT_PROVIDER ? {
    provider: process.env.PAYMENT_PROVIDER,
    apiKey: process.env.PAYMENT_API_KEY || '',
    baseUrl: process.env.PAYMENT_BASE_URL || ''
  } : undefined,
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  },
  monitoring: {
    enabled: process.env.MONITORING_ENABLED !== 'false',
    healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000', 10) // 30 seconds
  }
};

// Validate required configuration
function validateConfig(config: AppConfig): void {
  const errors: string[] = [];

  if (!config.database.url) {
    errors.push('DATABASE_URL is required');
  }

  if (config.server.port < 1 || config.server.port > 65535) {
    errors.push('PORT must be between 1 and 65535');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
  }
}

// Create and validate configuration
const config: AppConfig = { ...defaultConfig };
validateConfig(config);

// Export configuration
export default config;

// Export individual config sections for convenience
export const serverConfig = config.server;
export const databaseConfig = config.database;
export const kafkaConfig = config.kafka;
export const redisConfig = config.redis;
export const paymentConfig = config.payment;
export const loggingConfig = config.logging;
export const monitoringConfig = config.monitoring;
