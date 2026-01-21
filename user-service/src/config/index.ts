import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration validation schema
interface ConfigSchema {
  // Service configuration
  nodeEnv: 'development' | 'staging' | 'production' | 'test';
  serviceName: string;
  serviceVersion: string;
  port: number;

  // Database configuration
  database: {
    url: string;
    maxConnections: number;
    minConnections: number;
    connectionTimeout: number;
    queryTimeout: number;
  };

  // Security configuration
  security: {
    jwtSecret: string;
    jwtExpire: string;
    apiKey: string;
    corsOrigins: string[];
    hstsMaxAge: number;
    csp: string;
  };

  // Rate limiting configuration
  rateLimit: {
    windowMs: number;
    maxRequests: number;
    registrationMax: number;
    registrationWindowMs: number;
    verificationMax: number;
    verificationWindowMs: number;
    searchMax: number;
    searchWindowMs: number;
  };

  // Logging configuration
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug';
    format: 'json' | 'simple' | 'dev';
    externalUrl?: string;
    externalApiKey?: string;
  };

  // Event publishing configuration
  events: {
    enabled: boolean;
    messageQueueType: 'memory' | 'kafka' | 'rabbitmq';
    messageQueueUrl?: string;
    batchSize: number;
    timeout: number;
  };

  // Monitoring configuration
  monitoring: {
    enabled: boolean;
    metricsPort: number;
    healthCheckDbTimeout: number;
    healthCheckCacheTimeout: number;
  };

  // External services
  external: {
    emailServiceUrl?: string;
    emailServiceApiKey?: string;
    notificationServiceUrl?: string;
    notificationServiceApiKey?: string;
    redisUrl: string;
    redisPassword?: string;
    redisDb: number;
  };

  // Feature flags
  features: {
    emailVerification: boolean;
    phoneVerification: boolean;
    twoFactorAuth: boolean;
    userSearch: boolean;
    advancedAnalytics: boolean;
  };

  // Business rules
  businessRules: {
    userMinAge: number;
    userMaxFirstNameLength: number;
    userMaxLastNameLength: number;
    passwordMinLength: number;
    passwordRequireUppercase: boolean;
    passwordRequireLowercase: boolean;
    passwordRequireNumbers: boolean;
    passwordRequireSpecialChars: boolean;
    maxLoginAttempts: number;
    accountLockDurationMinutes: number;
    passwordResetTokenExpireMinutes: number;
    emailVerificationTokenExpireMinutes: number;
  };

  // Performance configuration
  performance: {
    requestTimeoutMs: number;
    databaseTimeoutMs: number;
    cacheTtlSeconds: number;
    cacheEnabled: boolean;
    compressionLevel: number;
    compressionThreshold: number;
  };

  // Development settings
  development: {
    debugMode: boolean;
    enableSwaggerDocs: boolean;
    enableRequestBodyLogging: boolean;
    testDatabaseUrl?: string;
  };

  // Deployment configuration
  deployment: {
    env: string;
    namespace: string;
    podName?: string;
    serviceAccount?: string;
    healthCheckPath: string;
    readinessCheckPath: string;
    livenessCheckPath: string;
  };
}

/**
 * Configuration manager class
 * Handles loading, validation, and access to configuration values
 */
class ConfigManager {
  private config: ConfigSchema;

  constructor() {
    this.config = this.loadConfig();
    this.validateConfig();
  }

  /**
   * Load configuration from environment variables
   */
  private loadConfig(): ConfigSchema {
    return {
      // Service configuration
      nodeEnv: this.parseNodeEnv(process.env.NODE_ENV || 'development'),
      serviceName: process.env.SERVICE_NAME || 'user-service',
      serviceVersion: process.env.SERVICE_VERSION || '1.0.0',
      port: parseInt(process.env.PORT || '3001', 10),

      // Database configuration
      database: {
        url: this.requireEnv('DATABASE_URL'),
        maxConnections: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '10', 10),
        minConnections: parseInt(process.env.DATABASE_MIN_CONNECTIONS || '2', 10),
        connectionTimeout: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '10000', 10),
        queryTimeout: parseInt(process.env.DATABASE_QUERY_TIMEOUT || '30000', 10)
      },

      // Security configuration
      security: {
        jwtSecret: this.requireEnv('JWT_SECRET'),
        jwtExpire: process.env.JWT_EXPIRE || '24h',
        apiKey: process.env.API_KEY || '',
        corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
        hstsMaxAge: parseInt(process.env.SECURITY_HSTS_MAX_AGE || '31536000', 10),
        csp: process.env.SECURITY_CSP || "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"
      },

      // Rate limiting configuration
      rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
        registrationMax: parseInt(process.env.RATE_LIMIT_REGISTRATION_MAX || '5', 10),
        registrationWindowMs: parseInt(process.env.RATE_LIMIT_REGISTRATION_WINDOW_MS || '900000', 10),
        verificationMax: parseInt(process.env.RATE_LIMIT_VERIFICATION_MAX || '3', 10),
        verificationWindowMs: parseInt(process.env.RATE_LIMIT_VERIFICATION_WINDOW_MS || '60000', 10),
        searchMax: parseInt(process.env.RATE_LIMIT_SEARCH_MAX || '30', 10),
        searchWindowMs: parseInt(process.env.RATE_LIMIT_SEARCH_WINDOW_MS || '60000', 10)
      },

      // Logging configuration
      logging: {
        level: this.parseLogLevel(process.env.LOG_LEVEL || 'info'),
        format: this.parseLogFormat(process.env.LOG_FORMAT || 'json'),
        externalUrl: process.env.LOG_EXTERNAL_URL,
        externalApiKey: process.env.LOG_EXTERNAL_API_KEY
      },

      // Event publishing configuration
      events: {
        enabled: process.env.EVENT_PUBLISHING_ENABLED !== 'false',
        messageQueueType: this.parseMessageQueueType(process.env.MESSAGE_QUEUE_TYPE || 'memory'),
        messageQueueUrl: process.env.MESSAGE_QUEUE_URL,
        batchSize: parseInt(process.env.EVENT_PUBLISHING_BATCH_SIZE || '10', 10),
        timeout: parseInt(process.env.EVENT_PUBLISHING_TIMEOUT || '5000', 10)
      },

      // Monitoring configuration
      monitoring: {
        enabled: process.env.METRICS_ENABLED !== 'false',
        metricsPort: parseInt(process.env.METRICS_PORT || '9090', 10),
        healthCheckDbTimeout: parseInt(process.env.HEALTH_CHECK_DATABASE_TIMEOUT || '5000', 10),
        healthCheckCacheTimeout: parseInt(process.env.HEALTH_CHECK_CACHE_TIMEOUT || '2000', 10)
      },

      // External services
      external: {
        emailServiceUrl: process.env.EMAIL_SERVICE_URL,
        emailServiceApiKey: process.env.EMAIL_SERVICE_API_KEY,
        notificationServiceUrl: process.env.NOTIFICATION_SERVICE_URL,
        notificationServiceApiKey: process.env.NOTIFICATION_SERVICE_API_KEY,
        redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
        redisPassword: process.env.REDIS_PASSWORD,
        redisDb: parseInt(process.env.REDIS_DB || '0', 10)
      },

      // Feature flags
      features: {
        emailVerification: process.env.FEATURE_EMAIL_VERIFICATION !== 'false',
        phoneVerification: process.env.FEATURE_PHONE_VERIFICATION === 'true',
        twoFactorAuth: process.env.FEATURE_TWO_FACTOR_AUTH === 'true',
        userSearch: process.env.FEATURE_USER_SEARCH !== 'false',
        advancedAnalytics: process.env.FEATURE_ADVANCED_ANALYTICS === 'true'
      },

      // Business rules
      businessRules: {
        userMinAge: parseInt(process.env.USER_MIN_AGE || '13', 10),
        userMaxFirstNameLength: parseInt(process.env.USER_MAX_FIRST_NAME_LENGTH || '50', 10),
        userMaxLastNameLength: parseInt(process.env.USER_MAX_LAST_NAME_LENGTH || '50', 10),
        passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10),
        passwordRequireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false',
        passwordRequireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE !== 'false',
        passwordRequireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS !== 'false',
        passwordRequireSpecialChars: process.env.PASSWORD_REQUIRE_SPECIAL_CHARS !== 'false',
        maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
        accountLockDurationMinutes: parseInt(process.env.ACCOUNT_LOCK_DURATION_MINUTES || '30', 10),
        passwordResetTokenExpireMinutes: parseInt(process.env.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES || '15', 10),
        emailVerificationTokenExpireMinutes: parseInt(process.env.EMAIL_VERIFICATION_TOKEN_EXPIRE_MINUTES || '1440', 10)
      },

      // Performance configuration
      performance: {
        requestTimeoutMs: parseInt(process.env.REQUEST_TIMEOUT_MS || '30000', 10),
        databaseTimeoutMs: parseInt(process.env.DATABASE_TIMEOUT_MS || '10000', 10),
        cacheTtlSeconds: parseInt(process.env.CACHE_TTL_SECONDS || '300', 10),
        cacheEnabled: process.env.CACHE_ENABLED !== 'false',
        compressionLevel: parseInt(process.env.COMPRESSION_LEVEL || '6', 10),
        compressionThreshold: parseInt(process.env.COMPRESSION_THRESHOLD || '1024', 10)
      },

      // Development settings
      development: {
        debugMode: process.env.DEBUG_MODE === 'true',
        enableSwaggerDocs: process.env.ENABLE_SWAGGER_DOCS !== 'false',
        enableRequestBodyLogging: process.env.ENABLE_REQUEST_BODY_LOGGING === 'true',
        testDatabaseUrl: process.env.TEST_DATABASE_URL
      },

      // Deployment configuration
      deployment: {
        env: process.env.DEPLOYMENT_ENV || 'development',
        namespace: process.env.NAMESPACE || 'default',
        podName: process.env.POD_NAME,
        serviceAccount: process.env.SERVICE_ACCOUNT,
        healthCheckPath: process.env.HEALTH_CHECK_PATH || '/health',
        readinessCheckPath: process.env.READINESS_CHECK_PATH || '/health/ready',
        livenessCheckPath: process.env.LIVENESS_CHECK_PATH || '/health/live'
      }
    };
  }

  /**
   * Validate configuration values
   */
  private validateConfig(): void {
    // Validate required environment variables
    const requiredVars = ['DATABASE_URL', 'JWT_SECRET'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    // Validate port range
    if (this.config.port < 1 || this.config.port > 65535) {
      throw new Error('Port must be between 1 and 65535');
    }

    // Validate database URL format
    if (!this.config.database.url.startsWith('postgresql://')) {
      throw new Error('DATABASE_URL must be a valid PostgreSQL connection string');
    }

    // Validate JWT secret length
    if (this.config.security.jwtSecret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long');
    }

    // Validate business rules
    if (this.config.businessRules.userMinAge < 0 || this.config.businessRules.userMinAge > 150) {
      throw new Error('USER_MIN_AGE must be between 0 and 150');
    }

    if (this.config.businessRules.passwordMinLength < 8) {
      throw new Error('PASSWORD_MIN_LENGTH must be at least 8');
    }
  }

  /**
   * Parse NODE_ENV with validation
   */
  private parseNodeEnv(env: string): ConfigSchema['nodeEnv'] {
    const validEnvs = ['development', 'staging', 'production', 'test'];
    if (!validEnvs.includes(env)) {
      throw new Error(`NODE_ENV must be one of: ${validEnvs.join(', ')}`);
    }
    return env as ConfigSchema['nodeEnv'];
  }

  /**
   * Parse log level with validation
   */
  private parseLogLevel(level: string): ConfigSchema['logging']['level'] {
    const validLevels = ['error', 'warn', 'info', 'debug'];
    if (!validLevels.includes(level)) {
      throw new Error(`LOG_LEVEL must be one of: ${validLevels.join(', ')}`);
    }
    return level as ConfigSchema['logging']['level'];
  }

  /**
   * Parse log format with validation
   */
  private parseLogFormat(format: string): ConfigSchema['logging']['format'] {
    const validFormats = ['json', 'simple', 'dev'];
    if (!validFormats.includes(format)) {
      throw new Error(`LOG_FORMAT must be one of: ${validFormats.join(', ')}`);
    }
    return format as ConfigSchema['logging']['format'];
  }

  /**
   * Parse message queue type with validation
   */
  private parseMessageQueueType(type: string): ConfigSchema['events']['messageQueueType'] {
    const validTypes = ['memory', 'kafka', 'rabbitmq'];
    if (!validTypes.includes(type)) {
      throw new Error(`MESSAGE_QUEUE_TYPE must be one of: ${validTypes.join(', ')}`);
    }
    return type as ConfigSchema['events']['messageQueueType'];
  }

  /**
   * Require environment variable
   */
  private requireEnv(varName: string): string {
    const value = process.env[varName];
    if (!value) {
      throw new Error(`Required environment variable ${varName} is not set`);
    }
    return value;
  }

  /**
   * Get the complete configuration object
   */
  getConfig(): ConfigSchema {
    return this.config;
  }

  /**
   * Get configuration for a specific section
   */
  get<K extends keyof ConfigSchema>(section: K): ConfigSchema[K] {
    return this.config[section];
  }

  /**
   * Check if running in production
   */
  isProduction(): boolean {
    return this.config.nodeEnv === 'production';
  }

  /**
   * Check if running in development
   */
  isDevelopment(): boolean {
    return this.config.nodeEnv === 'development';
  }

  /**
   * Check if running in test environment
   */
  isTest(): boolean {
    return this.config.nodeEnv === 'test';
  }

  /**
   * Get service info for health checks and metrics
   */
  getServiceInfo() {
    return {
      name: this.config.serviceName,
      version: this.config.serviceVersion,
      environment: this.config.nodeEnv,
      port: this.config.port
    };
  }
}

// Export singleton instance
export const config = new ConfigManager();
export type { ConfigSchema };
