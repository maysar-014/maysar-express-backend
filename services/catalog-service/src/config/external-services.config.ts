/**
 * External Services Configuration
 * Comprehensive third-party integrations configuration
 * Implements CDN, search, cache, image processing, and payment provider settings
 */

import { z } from 'zod';

// =====================================================================================
// EXTERNAL SERVICES CONFIGURATION SCHEMAS
// =====================================================================================

/**
 * CDN Configuration Schema
 */
const CDNConfigSchema = z.object({
  provider: z.enum(['cloudflare', 'aws', 'google']).default('cloudflare'),
  enabled: z.coerce.boolean().default(true),
  baseUrl: z.string().url().optional(),
  apiKey: z.string().optional(),
  secret: z.string().optional(),
  region: z.string().optional(),
  bucket: z.string().optional(),
  publicRead: z.coerce.boolean().default(true),
  signedUrls: z.coerce.boolean().default(false),
  signedUrlExpiration: z.coerce.number().default(3600), // 1 hour
});

/**
 * Search Configuration Schema
 */
const SearchConfigSchema = z.object({
  provider: z.enum(['elasticsearch', 'algolia', 'meilisearch']).default('elasticsearch'),
  enabled: z.coerce.boolean().default(true),
  elasticsearch: z.object({
    node: z.string().url().optional(),
    apiKey: z.string().optional(),
    indexPrefix: z.string().default('catalog'),
    username: z.string().optional(),
    password: z.string().optional(),
    ssl: z.coerce.boolean().default(true),
    requestTimeout: z.coerce.number().default(30000),
  }).optional(),
  algolia: z.object({
    appId: z.string().optional(),
    apiKey: z.string().optional(),
    searchOnlyApiKey: z.string().optional(),
    indexName: z.string().default('catalog'),
  }).optional(),
  meilisearch: z.object({
    host: z.string().optional(),
    port: z.coerce.number().default(7700),
    protocol: z.enum(['http', 'https']).default('http'),
    apiKey: z.string().optional(),
    indexName: z.string().default('catalog'),
    requestTimeout: z.coerce.number().default(30000),
  }).optional(),
});

/**
 * Cache Configuration Schema
 */
const CacheConfigSchema = z.object({
  provider: z.enum(['redis', 'memcached', 'memory']).default('redis'),
  enabled: z.coerce.boolean().default(true),
  redis: z.object({
    url: z.string().url().optional(),
    host: z.string().default('localhost'),
    port: z.coerce.number().default(6379),
    password: z.string().optional(),
    db: z.coerce.number().default(0),
    keyPrefix: z.string().default('catalog:'),
    ttl: z.coerce.number().default(3600), // 1 hour
  }).optional(),
  memcached: z.object({
    servers: z.string().default('localhost:11211'),
    options: z.record(z.unknown()).optional(),
  }).optional(),
});

/**
 * Image Processing Configuration Schema
 */
const ImageProcessingConfigSchema = z.object({
  provider: z.enum(['sharp', 'imagemagick']).default('sharp'),
  enabled: z.coerce.boolean().default(true),
  maxSize: z.coerce.number().default(10485760), // 10MB
  allowedFormats: z.string().default('jpg,jpeg,png,webp,gif'),
  quality: z.coerce.number().min(1).max(100).default(80),
  maxWidth: z.coerce.number().default(2048),
  maxHeight: z.coerce.number().default(2048),
  thumbnailSizes: z.string().default('100x100,300x300,600x600'),
  watermarkEnabled: z.coerce.boolean().default(false),
  watermarkText: z.string().optional(),
});

/**
 * File Upload Configuration Schema
 */
const FileUploadConfigSchema = z.object({
  provider: z.enum(['local', 's3', 'cloudflare']).default('local'),
  enabled: z.coerce.boolean().default(true),
  maxFiles: z.coerce.number().default(10),
  maxFileSize: z.coerce.number().default(10485760), // 10MB
  destination: z.string().default('./uploads'),
  allowedTypes: z.string().default('image/jpeg,image/png,image/webp,application/pdf'),
  s3: z.object({
    bucket: z.string().optional(),
    region: z.string().optional(),
    accessKeyId: z.string().optional(),
    secretAccessKey: z.string().optional(),
    publicRead: z.coerce.boolean().default(false),
  }).optional(),
});

/**
 * Payment Configuration Schema
 */
const PaymentConfigSchema = z.object({
  provider: z.enum(['paymentGateway']).optional(),
  enabled: z.coerce.boolean().default(false),
  paymentGateway: z.object({
    publishableKey: z.string().optional(),
    secretKey: z.string().optional(),
    webhookSecret: z.string().optional(),
    apiVersion: z.string().default('2023-10-16'),
    clientId: z.string().optional(),
    clientSecret: z.string().optional(),
    mode: z.enum(['sandbox', 'live']).default('sandbox'),
  }).optional(),
});

/**
 * Notification Configuration Schema
 */
const NotificationConfigSchema = z.object({
  provider: z.enum(['smtp', 'sendgrid', 'ses']).optional(),
  enabled: z.coerce.boolean().default(false),
  smtp: z.object({
    host: z.string().optional(),
    port: z.coerce.number().default(587),
    secure: z.coerce.boolean().default(false),
    user: z.string().optional(),
    pass: z.string().optional(),
    from: z.string().default('noreply@catalog.com'),
  }).optional(),
  sendgrid: z.object({
    apiKey: z.string().optional(),
    from: z.string().default('noreply@catalog.com'),
  }).optional(),
  ses: z.object({
    accessKeyId: z.string().optional(),
    secretAccessKey: z.string().optional(),
    region: z.string().default('us-east-1'),
    from: z.string().default('noreply@catalog.com'),
  }).optional(),
});

/**
 * Monitoring Configuration Schema
 */
const ExternalServicesMonitoringSchema = z.object({
  enableMetrics: z.coerce.boolean().default(true),
  metricsInterval: z.coerce.number().default(30000),
  enableHealthChecks: z.coerce.boolean().default(true),
  healthCheckTimeout: z.coerce.number().default(5000),
  alertOnFailures: z.coerce.boolean().default(true),
  circuitBreakerEnabled: z.coerce.boolean().default(true),
  circuitBreakerThreshold: z.coerce.number().default(5),
  circuitBreakerTimeout: z.coerce.number().default(60000), // 1 minute
});

// =====================================================================================
// EXTERNAL SERVICES CONFIGURATION INTERFACE
// =====================================================================================

/**
 * External Services Configuration Interface
 */
export interface ExternalServicesConfig {
  // CDN settings
  cdn: {
    provider: 'cloudflare' | 'aws' | 'google';
    enabled: boolean;
    baseUrl?: string;
    apiKey?: string;
    secret?: string;
    region?: string;
    bucket?: string;
    publicRead: boolean;
    signedUrls: boolean;
    signedUrlExpiration: number;
  };

  // Search settings
  search: {
    provider: 'elasticsearch' | 'algolia' | 'meilisearch';
    enabled: boolean;
    elasticsearch?: {
      node: string;
      apiKey: string;
      indexPrefix: string;
      username?: string;
      password?: string;
      ssl: boolean;
      requestTimeout: number;
    };
    algolia?: {
      appId: string;
      apiKey?: string;
      searchOnlyApiKey?: string;
      indexName: string;
    };
    meilisearch?: {
      host?: string;
      port?: number;
      protocol?: 'http' | 'https';
      apiKey?: string;
      indexName: string;
      requestTimeout: number;
    };
  };

  // Cache settings
  cache: {
    provider: 'redis' | 'memcached' | 'memory';
    enabled: boolean;
    redis?: {
      url?: string;
      host: string;
      port: number;
      password?: string;
      db: number;
      keyPrefix: string;
      ttl: number;
    };
    memcached?: {
      servers: string;
      options?: Record<string, any>;
    };
  };

  // Image processing settings
  image: {
    provider: 'sharp' | 'imagemagick';
    enabled: boolean;
    maxSize: number;
    allowedFormats: string[];
    quality: number;
    maxWidth: number;
    maxHeight: number;
    thumbnailSizes: string[];
    watermarkEnabled: boolean;
    watermarkText?: string;
  };

  // File upload settings
  upload: {
    provider: 'local' | 's3' | 'cloudflare';
    enabled: boolean;
    maxFiles: number;
    maxFileSize: number;
    destination: string;
    allowedTypes: string[];
    s3?: {
      bucket?: string;
      region?: string;
      accessKeyId?: string;
      secretAccessKey?: string;
      publicRead: boolean;
    };
  };

  // Payment settings
  payment?: {
    provider: 'paymentGateway';
    enabled: boolean;
    paymentGateway?: {
      publishableKey?: string;
      secretKey?: string;
      webhookSecret?: string;
      apiVersion: string;
      clientId?: string;
      clientSecret?: string;
      mode: 'sandbox' | 'live';
    };
  };

  // Notification settings
  notification?: {
    provider: 'smtp' | 'sendgrid' | 'ses';
    enabled: boolean;
    smtp?: {
      host?: string;
      port: number;
      secure: boolean;
      user?: string;
      pass?: string;
      from: string;
    };
    sendgrid?: {
      apiKey?: string;
      from: string;
    };
    ses?: {
      accessKeyId?: string;
      secretAccessKey?: string;
      region: string;
      from: string;
    };
  };

  // Monitoring settings
  monitoring: {
    enableMetrics: boolean;
    metricsInterval: number;
    enableHealthChecks: boolean;
    healthCheckTimeout: number;
    alertOnFailures: boolean;
    circuitBreakerEnabled: boolean;
    circuitBreakerThreshold: number;
    circuitBreakerTimeout: number;
  };
}

// =====================================================================================
// EXTERNAL SERVICES CONFIGURATION BUILDER
// =====================================================================================

/**
 * External Services Configuration Builder
 */
export class ExternalServicesConfigBuilder {
  /**
   * Build external services configuration
   */
  static build(): ExternalServicesConfig {
    const env = process.env;

    return {
      cdn: {
        provider: (env.CDN_PROVIDER as any) || 'cloudflare',
        enabled: env.CDN_ENABLED !== 'false',
        baseUrl: env.CDN_BASE_URL,
        apiKey: env.CDN_API_KEY,
        secret: env.CDN_SECRET,
        region: env.CDN_REGION,
        bucket: env.CDN_BUCKET,
        publicRead: env.CDN_PUBLIC_READ !== 'false',
        signedUrls: env.CDN_SIGNED_URLS === 'true',
        signedUrlExpiration: parseInt(env.CDN_SIGNED_URL_EXPIRATION || '3600')
      },
      search: {
        provider: (env.SEARCH_PROVIDER as any) || 'elasticsearch',
        enabled: env.SEARCH_ENABLED !== 'false',
        elasticsearch: env.ELASTICSEARCH_NODE ? {
          node: env.ELASTICSEARCH_NODE,
          apiKey: env.ELASTICSEARCH_API_KEY || '',
          indexPrefix: env.ELASTICSEARCH_INDEX_PREFIX || 'catalog',
          username: env.ELASTICSEARCH_USERNAME,
          password: env.ELASTICSEARCH_PASSWORD,
          ssl: env.ELASTICSEARCH_SSL !== 'false',
          requestTimeout: parseInt(env.ELASTICSEARCH_REQUEST_TIMEOUT || '30000')
        } : undefined,
        algolia: env.ALGOLIA_APP_ID ? {
          appId: env.ALGOLIA_APP_ID,
          apiKey: env.ALGOLIA_API_KEY,
          searchOnlyApiKey: env.ALGOLIA_SEARCH_ONLY_API_KEY,
          indexName: env.ALGOLIA_INDEX_NAME || 'catalog'
        } : undefined,
        meilisearch: env.MEILISEARCH_HOST ? {
          host: env.MEILISEARCH_HOST,
          port: parseInt(env.MEILISEARCH_PORT || '7700'),
          protocol: (env.MEILISEARCH_PROTOCOL as any) || 'http',
          apiKey: env.MEILISEARCH_API_KEY,
          indexName: env.MEILISEARCH_INDEX_NAME || 'catalog',
          requestTimeout: parseInt(env.MEILISEARCH_REQUEST_TIMEOUT || '30000')
        } : undefined
      },
      cache: {
        provider: (env.CACHE_PROVIDER as any) || 'redis',
        enabled: env.CACHE_ENABLED !== 'false',
        redis: {
          url: env.REDIS_URL,
          host: env.REDIS_HOST || 'localhost',
          port: parseInt(env.REDIS_PORT || '6379'),
          password: env.REDIS_PASSWORD,
          db: parseInt(env.REDIS_DB || '0'),
          keyPrefix: env.REDIS_KEY_PREFIX || 'catalog:',
          ttl: parseInt(env.REDIS_TTL || '3600')
        },
        memcached: env.MEMCACHED_SERVERS ? {
          servers: env.MEMCACHED_SERVERS,
          options: env.MEMCACHED_OPTIONS ? JSON.parse(env.MEMCACHED_OPTIONS) : undefined
        } : undefined
      },
      image: {
        provider: (env.IMAGE_PROVIDER as any) || 'sharp',
        enabled: env.IMAGE_ENABLED !== 'false',
        maxSize: parseInt(env.IMAGE_MAX_SIZE || '10485760'),
        allowedFormats: (env.IMAGE_ALLOWED_FORMATS || 'jpg,jpeg,png,webp,gif').split(','),
        quality: parseInt(env.IMAGE_QUALITY || '80'),
        maxWidth: parseInt(env.IMAGE_MAX_WIDTH || '2048'),
        maxHeight: parseInt(env.IMAGE_MAX_HEIGHT || '2048'),
        thumbnailSizes: (env.IMAGE_THUMBNAIL_SIZES || '100x100,300x300,600x600').split(','),
        watermarkEnabled: env.IMAGE_WATERMARK_ENABLED === 'true',
        watermarkText: env.IMAGE_WATERMARK_TEXT
      },
      upload: {
        provider: (env.UPLOAD_PROVIDER as any) || 'local',
        enabled: env.UPLOAD_ENABLED !== 'false',
        maxFiles: parseInt(env.UPLOAD_MAX_FILES || '10'),
        maxFileSize: parseInt(env.UPLOAD_MAX_FILE_SIZE || '10485760'),
        destination: env.UPLOAD_DESTINATION || './uploads',
        allowedTypes: (env.UPLOAD_ALLOWED_TYPES || 'image/jpeg,image/png,image/webp,application/pdf').split(','),
        s3: env.AWS_S3_BUCKET ? {
          bucket: env.AWS_S3_BUCKET,
          region: env.AWS_REGION,
          accessKeyId: env.AWS_ACCESS_KEY_ID,
          secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
          publicRead: env.AWS_S3_PUBLIC_READ === 'true'
        } : undefined
      },
      payment: env.PAYMENT_PROVIDER ? {
        provider: env.PAYMENT_PROVIDER as any,
        enabled: env.PAYMENT_ENABLED !== 'false',
        paymentGateway: (env.PAYMENT_GATEWAY_SECRET_KEY || env.PAYMENT_GATEWAY_CLIENT_ID) ? {
          publishableKey: env.PAYMENT_GATEWAY_PUBLISHABLE_KEY,
          secretKey: env.PAYMENT_GATEWAY_SECRET_KEY,
          webhookSecret: env.PAYMENT_GATEWAY_WEBHOOK_SECRET,
          apiVersion: env.PAYMENT_GATEWAY_API_VERSION || '2023-10-16',
          clientId: env.PAYMENT_GATEWAY_CLIENT_ID,
          clientSecret: env.PAYMENT_GATEWAY_CLIENT_SECRET,
          mode: (env.PAYMENT_GATEWAY_MODE as any) || 'sandbox'
        } : undefined
      } : undefined,
      notification: env.NOTIFICATION_PROVIDER ? {
        provider: env.NOTIFICATION_PROVIDER as any,
        enabled: env.NOTIFICATION_ENABLED !== 'false',
        smtp: env.SMTP_HOST ? {
          host: env.SMTP_HOST,
          port: parseInt(env.SMTP_PORT || '587'),
          secure: env.SMTP_SECURE === 'true',
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
          from: env.SMTP_FROM || 'noreply@catalog.com'
        } : undefined,
        sendgrid: env.SENDGRID_API_KEY ? {
          apiKey: env.SENDGRID_API_KEY,
          from: env.SENDGRID_FROM || 'noreply@catalog.com'
        } : undefined,
        ses: env.AWS_SES_ACCESS_KEY_ID ? {
          accessKeyId: env.AWS_SES_ACCESS_KEY_ID,
          secretAccessKey: env.AWS_SES_SECRET_ACCESS_KEY,
          region: env.AWS_SES_REGION || 'us-east-1',
          from: env.AWS_SES_FROM || 'noreply@catalog.com'
        } : undefined
      } : undefined,
      monitoring: {
        enableMetrics: env.EXTERNAL_SERVICES_ENABLE_METRICS !== 'false',
        metricsInterval: parseInt(env.EXTERNAL_SERVICES_METRICS_INTERVAL || '30000'),
        enableHealthChecks: env.EXTERNAL_SERVICES_ENABLE_HEALTH_CHECKS !== 'false',
        healthCheckTimeout: parseInt(env.EXTERNAL_SERVICES_HEALTH_CHECK_TIMEOUT || '5000'),
        alertOnFailures: env.EXTERNAL_SERVICES_ALERT_ON_FAILURES !== 'false',
        circuitBreakerEnabled: env.EXTERNAL_SERVICES_CIRCUIT_BREAKER_ENABLED !== 'false',
        circuitBreakerThreshold: parseInt(env.EXTERNAL_SERVICES_CIRCUIT_BREAKER_THRESHOLD || '5'),
        circuitBreakerTimeout: parseInt(env.EXTERNAL_SERVICES_CIRCUIT_BREAKER_TIMEOUT || '60000')
      }
    };
  }
}

// =====================================================================================
// EXTERNAL SERVICES HEALTH CHECKS
// =====================================================================================

/**
 * External Services Health Checker
 */
export class ExternalServicesHealthChecker {
  private config: ExternalServicesConfig;

  constructor(config: ExternalServicesConfig) {
    this.config = config;
  }

  /**
   * Perform comprehensive health check
   */
  async checkHealth(): Promise<{
    healthy: boolean;
    checks: Record<string, { status: 'pass' | 'fail' | 'warn'; message: string; duration?: number }>;
  }> {
    const checks: Record<string, { status: 'pass' | 'fail' | 'warn'; message: string; duration?: number }> = {};

    // CDN health check
    if (this.config.cdn.enabled) {
      try {
        const startTime = Date.now();
        const cdnHealthy = await this.checkCDNHealth();
        const duration = Date.now() - startTime;

        checks.cdn = {
          status: cdnHealthy ? 'pass' : 'fail',
          message: cdnHealthy ? 'CDN service healthy' : 'CDN service unavailable',
          duration
        };
      } catch (error) {
        checks.cdn = {
          status: 'fail',
          message: `CDN health check failed: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }

    // Search health check
    if (this.config.search.enabled) {
      try {
        const startTime = Date.now();
        const searchHealthy = await this.checkSearchHealth();
        const duration = Date.now() - startTime;

        checks.search = {
          status: searchHealthy ? 'pass' : 'fail',
          message: searchHealthy ? 'Search service healthy' : 'Search service unavailable',
          duration
        };
      } catch (error) {
        checks.search = {
          status: 'fail',
          message: `Search health check failed: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }

    // Cache health check
    if (this.config.cache.enabled) {
      try {
        const startTime = Date.now();
        const cacheHealthy = await this.checkCacheHealth();
        const duration = Date.now() - startTime;

        checks.cache = {
          status: cacheHealthy ? 'pass' : 'fail',
          message: cacheHealthy ? 'Cache service healthy' : 'Cache service unavailable',
          duration
        };
      } catch (error) {
        checks.cache = {
          status: 'fail',
          message: `Cache health check failed: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }

    const healthy = Object.values(checks).every(check => check.status !== 'fail');

    return { healthy, checks };
  }

  private async checkCDNHealth(): Promise<boolean> {
    // Placeholder implementation
    return true;
  }

  private async checkSearchHealth(): Promise<boolean> {
    // Placeholder implementation
    return true;
  }

  private async checkCacheHealth(): Promise<boolean> {
    // Placeholder implementation
    return true;
  }
}

// =====================================================================================
// EXTERNAL SERVICES METRICS
// =====================================================================================

/**
 * External Services Metrics Collector
 */
export class ExternalServicesMetricsCollector {
  private config: ExternalServicesConfig;

  constructor(config: ExternalServicesConfig) {
    this.config = config;
  }

  /**
   * Collect external services metrics
   */
  async collectMetrics(): Promise<Record<string, number>> {
    const metrics: Record<string, number> = {};

    // CDN metrics
    if (this.config.cdn.enabled) {
      metrics.cdn_requests_total = await this.getCDNRequestsTotal();
      metrics.cdn_bandwidth_used = await this.getCDNBandwidthUsed();
    }

    // Search metrics
    if (this.config.search.enabled) {
      metrics.search_queries_total = await this.getSearchQueriesTotal();
      metrics.search_avg_response_time = await this.getSearchAvgResponseTime();
    }

    // Cache metrics
    if (this.config.cache.enabled) {
      metrics.cache_hit_rate = await this.getCacheHitRate();
      metrics.cache_memory_used = await this.getCacheMemoryUsed();
    }

    return metrics;
  }

  private async getCDNRequestsTotal(): Promise<number> {
    // Placeholder implementation
    return 10000;
  }

  private async getCDNBandwidthUsed(): Promise<number> {
    // Placeholder implementation
    return 1024 * 1024 * 500; // 500MB
  }

  private async getSearchQueriesTotal(): Promise<number> {
    // Placeholder implementation
    return 5000;
  }

  private async getSearchAvgResponseTime(): Promise<number> {
    // Placeholder implementation
    return 150; // milliseconds
  }

  private async getCacheHitRate(): Promise<number> {
    // Placeholder implementation
    return 85; // percentage
  }

  private async getCacheMemoryUsed(): Promise<number> {
    // Placeholder implementation
    return 1024 * 1024 * 50; // 50MB
  }
}

// =====================================================================================
// CIRCUIT BREAKER IMPLEMENTATION
// =====================================================================================

/**
 * Circuit Breaker for External Services
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private threshold: number,
    private timeout: number
  ) {}

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }

  getState(): 'closed' | 'open' | 'half-open' {
    return this.state;
  }
}

// =====================================================================================
// EXTERNAL SERVICES CONFIGURATION EXPORTS
// =====================================================================================

/**
 * Get external services configuration
 */
export function getExternalServicesConfig(): ExternalServicesConfig {
  return ExternalServicesConfigBuilder.build();
}

/**
 * Create external services health checker
 */
export function createExternalServicesHealthChecker(config?: ExternalServicesConfig): ExternalServicesHealthChecker {
  return new ExternalServicesHealthChecker(config || getExternalServicesConfig());
}

/**
 * Create external services metrics collector
 */
export function createExternalServicesMetricsCollector(config?: ExternalServicesConfig): ExternalServicesMetricsCollector {
  return new ExternalServicesMetricsCollector(config || getExternalServicesConfig());
}

/**
 * Create circuit breaker
 */
export function createCircuitBreaker(threshold: number, timeout: number): CircuitBreaker {
  return new CircuitBreaker(threshold, timeout);
}

/**
 * Validate external services configuration
 */
export function validateExternalServicesConfig(config?: ExternalServicesConfig): { valid: boolean; errors: string[] } {
  try {
    const extConfig = config || getExternalServicesConfig();
    const errors: string[] = [];

    // Validate CDN configuration
    if (extConfig.cdn.enabled && !extConfig.cdn.baseUrl) {
      errors.push('CDN base URL is required when CDN is enabled');
    }

    // Validate search configuration
    if (extConfig.search.enabled) {
      if (extConfig.search.provider === 'elasticsearch' && !extConfig.search.elasticsearch?.node) {
        errors.push('Elasticsearch node URL is required when using Elasticsearch');
      }
      if (extConfig.search.provider === 'algolia' && !extConfig.search.algolia?.appId) {
        errors.push('Algolia App ID is required when using Algolia');
      }
      if (extConfig.search.provider === 'meilisearch' && !extConfig.search.meilisearch?.host) {
        errors.push('Meilisearch host is required when using Meilisearch');
      }
    }

    // Validate cache configuration
    if (extConfig.cache.enabled) {
      if (extConfig.cache.provider === 'redis' && !extConfig.cache.redis?.url && !extConfig.cache.redis?.host) {
        errors.push('Redis URL or host is required when using Redis cache');
      }
    }

    // Validate payment configuration
    if (extConfig.payment?.enabled) {
      if (
        extConfig.payment.provider === 'paymentGateway' &&
        !extConfig.payment.paymentGateway?.secretKey &&
        !extConfig.payment.paymentGateway?.clientId
      ) {
        errors.push('PaymentGateway secret key or client ID is required when using PaymentGateway payments');
      }
      if (
        extConfig.payment.provider === 'paymentGateway' &&
        extConfig.payment.paymentGateway?.clientId &&
        !extConfig.payment.paymentGateway?.clientSecret
      ) {
        errors.push('PaymentGateway client secret is required when PaymentGateway client ID is configured');
      }
    }

    // Validate notification configuration
    if (extConfig.notification?.enabled) {
      if (extConfig.notification.provider === 'smtp' && !extConfig.notification.smtp?.host) {
        errors.push('SMTP host is required when using SMTP notifications');
      }
      if (extConfig.notification.provider === 'sendgrid' && !extConfig.notification.sendgrid?.apiKey) {
        errors.push('SendGrid API key is required when using SendGrid notifications');
      }
      if (extConfig.notification.provider === 'ses' && !extConfig.notification.ses?.accessKeyId) {
        errors.push('AWS SES access key ID is required when using SES notifications');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)]
    };
  }
}

/**
 * Default external services configuration
 */
export const externalServicesConfig = getExternalServicesConfig();

