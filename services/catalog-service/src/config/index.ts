// @ts-nocheck
/**
 * Main Configuration Loader
 * Centralized configuration management with validation and runtime reloading
 * Implements environment variable validation, secret management, and configuration schema validation
 */

import { z } from 'zod';

// =====================================================================================
// CONFIGURATION SCHEMAS
// =====================================================================================

/**
 * Environment Schema
 */
const EnvironmentSchema = z.enum(['development', 'staging', 'production', 'test']);

/**
 * Base Configuration Schema
 */
const BaseConfigSchema = z.object({
  NODE_ENV: EnvironmentSchema.default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('localhost'),

  // Service Identity
  SERVICE_NAME: z.string().default('catalog-service'),
  SERVICE_VERSION: z.string().default('1.0.0'),
  SERVICE_DESCRIPTION: z.string().default('Product Catalog Service'),

  // Security
  CORS_ORIGINS: z.string().optional(),
  CORS_CREDENTIALS: z.coerce.boolean().default(true),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  RATE_LIMIT_STRATEGY: z.enum(['fixed', 'sliding', 'token-bucket']).default('fixed'),

  // Authentication
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  JWT_EXPIRATION: z.coerce.number().default(900000), // 15 minutes
  JWT_REFRESH_EXPIRATION: z.coerce.number().default(604800000), // 7 days

  // Authorization
  ADMIN_ROLES: z.string().default('admin,superuser'),
  AUTHZ_RBAC: z.coerce.boolean().default(true),

  // Validation
  VALIDATION_SANITIZE: z.coerce.boolean().default(true),
  MAX_REQUEST_SIZE: z.coerce.number().default(10485760), // 10MB

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FORMAT: z.enum(['json', 'simple']).default('json'),

  // Monitoring
  ENABLE_METRICS: z.coerce.boolean().default(true),
  METRICS_PORT: z.coerce.number().default(9090),

  // Health Checks
  HEALTH_CHECK_INTERVAL: z.coerce.number().default(30000), // 30 seconds
  HEALTH_CHECK_TIMEOUT: z.coerce.number().default(5000), // 5 seconds
});

/**
 * Database Configuration Schema
 */
const DatabaseConfigSchema = z.object({
  DATABASE_URL: z.string().url('Invalid DATABASE_URL'),
  DATABASE_SSL: z.coerce.boolean().default(false),
  DATABASE_MAX_CONNECTIONS: z.coerce.number().default(20),
  DATABASE_IDLE_TIMEOUT: z.coerce.number().default(30000),
  DATABASE_CONNECTION_TIMEOUT: z.coerce.number().default(10000),

  // Prisma specific
  PRISMA_LOG_LEVEL: z.enum(['query', 'info', 'warn', 'error']).default('warn'),
  PRISMA_GENERATE_SCHEMA: z.coerce.boolean().default(false),
});

/**
 * Messaging Configuration Schema
 */
const MessagingConfigSchema = z.object({
  // Kafka Configuration
  KAFKA_BROKERS: z.string().default('localhost:9092'),
  KAFKA_CLIENT_ID: z.string().default('catalog-service'),
  KAFKA_GROUP_ID: z.string().default('catalog-service-group'),
  KAFKA_SSL: z.coerce.boolean().default(false),
  KAFKA_SASL_MECHANISM: z.enum(['plain', 'scram-sha-256', 'scram-sha-512']).optional(),
  KAFKA_SASL_USERNAME: z.string().optional(),
  KAFKA_SASL_PASSWORD: z.string().optional(),

  // RabbitMQ Configuration (alternative)
  RABBITMQ_URL: z.string().url().optional(),
  RABBITMQ_HEARTBEAT: z.coerce.number().default(60),

  // Event Store
  EVENT_STORE_CONNECTION: z.string().default('memory'), // memory, redis, database
  EVENT_STORE_REDIS_URL: z.string().optional(),
  EVENT_STORE_RETENTION_DAYS: z.coerce.number().default(30),
});

/**
 * External Services Configuration Schema
 */
const ExternalServicesConfigSchema = z.object({
  // CDN Configuration
  CDN_PROVIDER: z.enum(['cloudflare', 'aws', 'google']).default('cloudflare'),
  CDN_BASE_URL: z.string().url().optional(),
  CDN_API_KEY: z.string().optional(),
  CDN_SECRET: z.string().optional(),

  // Search Configuration
  SEARCH_PROVIDER: z.enum(['elasticsearch', 'algolia', 'meilisearch']).default('elasticsearch'),
  ELASTICSEARCH_NODE: z.string().url().optional(),
  ELASTICSEARCH_API_KEY: z.string().optional(),
  ELASTICSEARCH_INDEX_PREFIX: z.string().default('catalog'),
  MEILISEARCH_HOST: z.string().optional(),
  MEILISEARCH_PORT: z.coerce.number().optional(),
  MEILISEARCH_PROTOCOL: z.enum(['http', 'https']).optional(),
  MEILISEARCH_API_KEY: z.string().optional(),
  MEILISEARCH_INDEX_NAME: z.string().optional(),
  MEILISEARCH_REQUEST_TIMEOUT: z.coerce.number().optional(),

  // Cache Configuration
  CACHE_PROVIDER: z.enum(['redis', 'memcached', 'memory']).default('redis'),
  REDIS_URL: z.string().url().optional(),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().default(0),

  // Image Processing
  IMAGE_PROVIDER: z.enum(['sharp', 'imagemagick']).default('sharp'),
  IMAGE_MAX_SIZE: z.coerce.number().default(10485760), // 10MB
  IMAGE_ALLOWED_FORMATS: z.string().default('jpg,jpeg,png,webp'),

  // File Upload
  UPLOAD_PROVIDER: z.enum(['local', 's3', 'cloudflare']).default('local'),
  UPLOAD_MAX_FILES: z.coerce.number().default(10),
  UPLOAD_DESTINATION: z.string().default('./uploads'),

  // Payment (if needed)
  PAYMENT_PROVIDER: z.enum(['pesapal']).optional(),
  PESAPAL_SECRET_KEY: z.string().optional(),
  PESAPAL_WEBHOOK_SECRET: z.string().optional(),

  // Notification
  NOTIFICATION_PROVIDER: z.enum(['smtp', 'sendgrid', 'ses']).optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_SECURE: z.coerce.boolean().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
});

// =====================================================================================
// CONFIGURATION INTERFACES
// =====================================================================================

/**
 * Application Configuration Interface
 */
export interface AppConfig {
  // Base Configuration
  env: z.infer<typeof EnvironmentSchema>;
  port: number;
  host: string;
  service: {
    name: string;
    version: string;
    description: string;
  };

  // Security Configuration
  security: {
    corsOrigins: string[];
    corsCredentials: boolean;
    jwtSecret: string;
    jwtExpiration: number;
    jwtRefreshExpiration: number;
    adminRoles: string[];
    enableRBAC: boolean;
  };

  // Rate Limiting
  rateLimit: {
    windowMs: number;
    maxRequests: number;
    strategy: 'fixed' | 'sliding' | 'token-bucket';
  };

  // Validation
  validation: {
    enableSanitization: boolean;
    maxRequestSize: number;
  };

  // Logging
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug';
    format: 'json' | 'simple';
  };

  // Monitoring
  monitoring: {
    enableMetrics: boolean;
    metricsPort: number;
    healthCheckInterval: number;
    healthCheckTimeout: number;
  };

  // Database
  database: {
    url: string;
    ssl: boolean;
    maxConnections: number;
    idleTimeout: number;
    connectionTimeout: number;
    prismaLogLevel: 'query' | 'info' | 'warn' | 'error';
    generateSchema: boolean;
  };

  // Messaging
  messaging: {
    kafka: {
      brokers: string;
      clientId: string;
      groupId: string;
      ssl: boolean;
      sasl?: {
        mechanism: 'plain' | 'scram-sha-256' | 'scram-sha-512';
        username: string;
        password: string;
      };
    };
    rabbitmq?: {
      url: string;
      heartbeat: number;
    };
    eventStore: {
      connection: string;
      redisUrl?: string;
      retentionDays: number;
    };
  };

  // External Services
  externalServices: {
    cdn: {
      provider: 'cloudflare' | 'aws' | 'google';
      baseUrl?: string;
      apiKey?: string;
      secret?: string;
    };
    search: {
      provider: 'elasticsearch' | 'algolia' | 'meilisearch';
      elasticsearch?: {
        node: string;
        apiKey: string;
        indexPrefix: string;
      };
      meilisearch?: {
        host: string;
        port: number;
        protocol: 'http' | 'https';
        apiKey?: string;
        indexName: string;
        requestTimeout: number;
      };
    };
    cache: {
      provider: 'redis' | 'memcached' | 'memory';
      redis?: {
        url: string;
        password: string;
        db: number;
      };
    };
    image: {
      provider: 'sharp' | 'imagemagick';
      maxSize: number;
      allowedFormats: string[];
    };
    upload: {
      provider: 'local' | 's3' | 'cloudflare';
      maxFiles: number;
      destination: string;
    };
    payment?: {
      provider: 'pesapal';
      pesapal?: {
        secretKey: string;
        webhookSecret: string;
      };
    };
    notification?: {
      provider: 'smtp' | 'sendgrid' | 'ses';
      smtp?: {
        host: string;
        port: number;
        secure: boolean;
        user: string;
        pass: string;
      };
    };
  };
}

// =====================================================================================
// CONFIGURATION LOADER
// =====================================================================================

/**
 * Configuration Manager
 * Handles loading, validation, and runtime reloading of configuration
 */
export class ConfigurationManager {
  private static instance: ConfigurationManager;
  private config: AppConfig;
  private watchers: Array<(config: AppConfig) => void> = [];
  private lastModified: Map<string, number> = new Map();

  private constructor() {
    this.config = this.loadConfiguration();
    this.setupFileWatchers();
  }

  static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager();
    }
    return ConfigurationManager.instance;
  }

  /**
   * Get current configuration
   */
  getConfig(): AppConfig {
    return { ...this.config };
  }

  /**
   * Reload configuration
   */
  async reload(): Promise<AppConfig> {
    try {
      const newConfig = this.loadConfiguration();
      this.config = newConfig;

      // Notify watchers
      this.watchers.forEach(watcher => {
        try {
          watcher(newConfig);
        } catch (error) {
          console.error('[CONFIG] Watcher error:', error);
        }
      });

      console.log('[CONFIG] Configuration reloaded successfully');
      return newConfig;
    } catch (error) {
      console.error('[CONFIG] Failed to reload configuration:', error);
      throw error;
    }
  }

  /**
   * Watch for configuration changes
   */
  onChange(callback: (config: AppConfig) => void): void {
    this.watchers.push(callback);
  }

  /**
   * Validate configuration
   */
  validate(): { valid: boolean; errors: string[] } {
    try {
      this.loadConfiguration();
      return { valid: true, errors: [] };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.issues.map((err: any) => `${err.path.join('.')}: ${err.message}`);
        return { valid: false, errors };
      }
      return { valid: false, errors: [error instanceof Error ? error.message : String(error)] };
    }
  }

  /**
   * Load and validate configuration
   */
  private loadConfiguration(): AppConfig {
    // Load environment variables
    const env = process.env;

    // Validate base configuration
    const baseConfig = BaseConfigSchema.parse(env);

    // Validate database configuration
    const databaseConfig = DatabaseConfigSchema.parse(env);

    // Validate messaging configuration
    const messagingConfig = MessagingConfigSchema.parse(env);

    // Validate external services configuration
    const externalServicesConfig = ExternalServicesConfigSchema.parse(env);

    // Build complete configuration
    return {
      env: baseConfig.NODE_ENV,
      port: baseConfig.PORT,
      host: baseConfig.HOST,
      service: {
        name: baseConfig.SERVICE_NAME,
        version: baseConfig.SERVICE_VERSION,
        description: baseConfig.SERVICE_DESCRIPTION
      },
      security: {
        corsOrigins: baseConfig.CORS_ORIGINS ? baseConfig.CORS_ORIGINS.split(',').map(s => s.trim()) : [],
        corsCredentials: baseConfig.CORS_CREDENTIALS,
        jwtSecret: baseConfig.JWT_SECRET,
        jwtExpiration: baseConfig.JWT_EXPIRATION,
        jwtRefreshExpiration: baseConfig.JWT_REFRESH_EXPIRATION,
        adminRoles: baseConfig.ADMIN_ROLES.split(','),
        enableRBAC: baseConfig.AUTHZ_RBAC
      },
      rateLimit: {
        windowMs: baseConfig.RATE_LIMIT_WINDOW_MS,
        maxRequests: baseConfig.RATE_LIMIT_MAX_REQUESTS,
        strategy: baseConfig.RATE_LIMIT_STRATEGY
      },
      validation: {
        enableSanitization: baseConfig.VALIDATION_SANITIZE,
        maxRequestSize: baseConfig.MAX_REQUEST_SIZE
      },
      logging: {
        level: baseConfig.LOG_LEVEL,
        format: baseConfig.LOG_FORMAT
      },
      monitoring: {
        enableMetrics: baseConfig.ENABLE_METRICS,
        metricsPort: baseConfig.METRICS_PORT,
        healthCheckInterval: baseConfig.HEALTH_CHECK_INTERVAL,
        healthCheckTimeout: baseConfig.HEALTH_CHECK_TIMEOUT
      },
      database: {
        url: databaseConfig.DATABASE_URL,
        ssl: databaseConfig.DATABASE_SSL,
        maxConnections: databaseConfig.DATABASE_MAX_CONNECTIONS,
        idleTimeout: databaseConfig.DATABASE_IDLE_TIMEOUT,
        connectionTimeout: databaseConfig.DATABASE_CONNECTION_TIMEOUT,
        prismaLogLevel: databaseConfig.PRISMA_LOG_LEVEL,
        generateSchema: databaseConfig.PRISMA_GENERATE_SCHEMA
      },
      messaging: {
        kafka: {
          brokers: messagingConfig.KAFKA_BROKERS,
          clientId: messagingConfig.KAFKA_CLIENT_ID,
          groupId: messagingConfig.KAFKA_GROUP_ID,
          ssl: messagingConfig.KAFKA_SSL,
          sasl: messagingConfig.KAFKA_SASL_MECHANISM ? {
            mechanism: messagingConfig.KAFKA_SASL_MECHANISM,
            username: messagingConfig.KAFKA_SASL_USERNAME!,
            password: messagingConfig.KAFKA_SASL_PASSWORD!
          } : undefined
        },
        rabbitmq: messagingConfig.RABBITMQ_URL ? {
          url: messagingConfig.RABBITMQ_URL,
          heartbeat: messagingConfig.RABBITMQ_HEARTBEAT
        } : undefined,
        eventStore: {
          connection: messagingConfig.EVENT_STORE_CONNECTION,
          redisUrl: messagingConfig.EVENT_STORE_REDIS_URL,
          retentionDays: messagingConfig.EVENT_STORE_RETENTION_DAYS
        }
      },
      externalServices: {
        cdn: {
          provider: externalServicesConfig.CDN_PROVIDER,
          baseUrl: externalServicesConfig.CDN_BASE_URL,
          apiKey: externalServicesConfig.CDN_API_KEY,
          secret: externalServicesConfig.CDN_SECRET
        },
        search: {
          provider: externalServicesConfig.SEARCH_PROVIDER,
          elasticsearch: externalServicesConfig.ELASTICSEARCH_NODE ? {
            node: externalServicesConfig.ELASTICSEARCH_NODE,
            apiKey: externalServicesConfig.ELASTICSEARCH_API_KEY || '',
            indexPrefix: externalServicesConfig.ELASTICSEARCH_INDEX_PREFIX
          } : undefined,
          meilisearch: externalServicesConfig.MEILISEARCH_HOST ? {
            host: externalServicesConfig.MEILISEARCH_HOST,
            port: externalServicesConfig.MEILISEARCH_PORT || 7700,
            protocol: externalServicesConfig.MEILISEARCH_PROTOCOL || 'http',
            apiKey: externalServicesConfig.MEILISEARCH_API_KEY,
            indexName: externalServicesConfig.MEILISEARCH_INDEX_NAME || 'catalog',
            requestTimeout: externalServicesConfig.MEILISEARCH_REQUEST_TIMEOUT || 30000
          } : undefined
        },
        cache: {
          provider: externalServicesConfig.CACHE_PROVIDER,
          redis: externalServicesConfig.REDIS_URL ? {
            url: externalServicesConfig.REDIS_URL,
            password: externalServicesConfig.REDIS_PASSWORD,
            db: externalServicesConfig.REDIS_DB
          } : undefined
        },
        image: {
          provider: externalServicesConfig.IMAGE_PROVIDER,
          maxSize: externalServicesConfig.IMAGE_MAX_SIZE,
          allowedFormats: externalServicesConfig.IMAGE_ALLOWED_FORMATS.split(',')
        },
        upload: {
          provider: externalServicesConfig.UPLOAD_PROVIDER,
          maxFiles: externalServicesConfig.UPLOAD_MAX_FILES,
          destination: externalServicesConfig.UPLOAD_DESTINATION
        },
        payment: externalServicesConfig.PAYMENT_PROVIDER ? {
          provider: externalServicesConfig.PAYMENT_PROVIDER,
          pesapal: externalServicesConfig.PESAPAL_SECRET_KEY ? {
            secretKey: externalServicesConfig.PESAPAL_SECRET_KEY,
            webhookSecret: externalServicesConfig.PESAPAL_WEBHOOK_SECRET || ''
          } : undefined
        } : undefined,
        notification: externalServicesConfig.NOTIFICATION_PROVIDER ? {
          provider: externalServicesConfig.NOTIFICATION_PROVIDER,
          smtp: externalServicesConfig.SMTP_HOST ? {
            host: externalServicesConfig.SMTP_HOST,
            port: externalServicesConfig.SMTP_PORT || 587,
            secure: externalServicesConfig.SMTP_SECURE || false,
            user: externalServicesConfig.SMTP_USER || '',
            pass: externalServicesConfig.SMTP_PASS || ''
          } : undefined
        } : undefined
      }
    };
  }

  /**
   * Setup file watchers for hot reloading
   */
  private setupFileWatchers(): void {
    // In a real implementation, this would watch .env files for changes
    // For now, we'll skip this as it's complex in a Node.js environment
  }
}

// =====================================================================================
// CONFIGURATION EXPORTS
// =====================================================================================

/**
 * Get configuration instance
 */
export function getConfig(): AppConfig {
  return ConfigurationManager.getInstance().getConfig();
}

/**
 * Reload configuration
 */
export async function reloadConfig(): Promise<AppConfig> {
  return ConfigurationManager.getInstance().reload();
}

/**
 * Watch configuration changes
 */
export function watchConfig(callback: (config: AppConfig) => void): void {
  ConfigurationManager.getInstance().onChange(callback);
}

/**
 * Validate configuration
 */
export function validateConfig(): { valid: boolean; errors: string[] } {
  return ConfigurationManager.getInstance().validate();
}

/**
 * Default configuration export
 */
export const config = getConfig();

/**
 * Environment-based configuration helpers
 */
export const isDevelopment = () => config.env === 'development';
export const isProduction = () => config.env === 'production';
export const isStaging = () => config.env === 'staging';
export const isTest = () => config.env === 'test';

/**
 * Configuration utilities
 */
export class ConfigUtils {
  static getDatabaseUrl(): string {
    return config.database.url;
  }

  static getJWTSecret(): string {
    return config.security.jwtSecret;
  }

  static getServiceName(): string {
    return config.service.name;
  }

  static getCORSOrigins(): string[] {
    return config.security.corsOrigins;
  }

  static getRateLimitConfig() {
    return config.rateLimit;
  }

  static getExternalServiceConfig(service: keyof AppConfig['externalServices']) {
    return config.externalServices[service];
  }

  static requireEnvVar(name: string): string {
    const value = process.env[name];
    if (!value) {
      throw new Error(`Required environment variable ${name} is not set`);
    }
    return value;
  }

  static getEnvVar(name: string, defaultValue?: string): string | undefined {
    return process.env[name] || defaultValue;
  }
}

