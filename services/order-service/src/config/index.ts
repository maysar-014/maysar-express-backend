import { config } from 'dotenv';
import { z } from 'zod';
import { DatabaseConfig, loadDatabaseConfig } from './database.config';

// Load environment variables
config();

// Environment schema validation
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.string().transform(Number).default('3002'),

  // Database
  DATABASE_URL: z.string().url(),
  DB_MAX_CONNECTIONS: z.string().transform(Number).default('10'),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_KEY: z.string().min(1),

  // Security
  CORS_ORIGIN: z.string().optional(),
  JWT_SECRET: z.string().min(32).optional(),
  API_KEY: z.string().optional(),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),

  // External Services
  PESAPAL_API_URL: z.string().url().optional(),
  PESAPAL_API_KEY: z.string().optional(),

  // Redis (for future caching)
  REDIS_URL: z.string().optional(),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().default('6379'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.string().default('0'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FORMAT: z.enum(['json', 'simple']).default('simple'),

  // Monitoring
  ENABLE_METRICS: z.string().transform((val: string) => val === 'true').default('false'),
  METRICS_PORT: z.string().transform((val: string) => Number(val)).default('9090'),

  // Feature Flags
  ENABLE_RATE_LIMITING: z.string().transform((val: string) => val === 'true').default('true'),
  ENABLE_CORS: z.string().transform((val: string) => val === 'true').default('true'),
  ENABLE_COMPRESSION: z.string().transform((val: string) => val === 'true').default('true'),
});

export type EnvironmentConfig = z.infer<typeof envSchema>;

// Validate environment variables
let env: EnvironmentConfig;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  console.error('❌ Environment validation failed:', error);
  process.exit(1);
}

// Application configuration
export interface AppConfig {
  env: EnvironmentConfig;
  database: DatabaseConfig;
  security: SecurityConfig;
  monitoring: MonitoringConfig;
  features: FeatureFlags;
}

// Security configuration
export interface SecurityConfig {
  cors: {
    enabled: boolean;
    origins: string[];
    credentials: boolean;
    maxAge: number;
  };
  rateLimiting: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
    authMaxAttempts: number;
    paymentMaxAttempts: number;
  };
  helmet: {
    enabled: boolean;
    contentSecurityPolicy: boolean;
    hsts: {
      maxAge: number;
      includeSubDomains: boolean;
      preload: boolean;
    };
  };
  jwt?: {
    secret: string;
    expiresIn: string;
  };
}

// Monitoring configuration
export interface MonitoringConfig {
  enabled: boolean;
  logLevel: string;
  logFormat: string;
  metrics: {
    enabled: boolean;
    port: number;
  };
  healthChecks: {
    enabled: boolean;
    interval: number;
  };
}

// Feature flags
export interface FeatureFlags {
  rateLimiting: boolean;
  cors: boolean;
  compression: boolean;
  caching: boolean;
  metrics: boolean;
  auditLogging: boolean;
}

// Load security configuration
function loadSecurityConfig(): SecurityConfig {
  const corsOrigins = env.CORS_ORIGIN?.split(',') || [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://maysar.com',
    'https://admin.maysar.com'
  ];

  return {
    cors: {
      enabled: env.ENABLE_CORS,
      origins: corsOrigins,
      credentials: true,
      maxAge: 86400, // 24 hours
    },
    rateLimiting: {
      enabled: env.ENABLE_RATE_LIMITING,
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
      authMaxAttempts: 5,
      paymentMaxAttempts: 20,
    },
    helmet: {
      enabled: true,
      contentSecurityPolicy: true,
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
    },
    jwt: env.JWT_SECRET ? {
      secret: env.JWT_SECRET,
      expiresIn: '24h',
    } : undefined,
  };
}

// Load monitoring configuration
function loadMonitoringConfig(): MonitoringConfig {
  return {
    enabled: true,
    logLevel: env.LOG_LEVEL,
    logFormat: env.LOG_FORMAT,
    metrics: {
      enabled: env.ENABLE_METRICS,
      port: env.METRICS_PORT,
    },
    healthChecks: {
      enabled: true,
      interval: 30000, // 30 seconds
    },
  };
}

// Load feature flags
function loadFeatureFlags(): FeatureFlags {
  return {
    rateLimiting: env.ENABLE_RATE_LIMITING,
    cors: env.ENABLE_CORS,
    compression: env.ENABLE_COMPRESSION,
    caching: !!env.REDIS_URL,
    metrics: env.ENABLE_METRICS,
    auditLogging: false, // Will be enabled in Phase 4
  };
}

// Load complete application configuration
function loadAppConfig(): AppConfig {
  return {
    env,
    database: loadDatabaseConfig(),
    security: loadSecurityConfig(),
    monitoring: loadMonitoringConfig(),
    features: loadFeatureFlags(),
  };
}

// Export configuration instance
export const appConfig = loadAppConfig();

// Environment helpers
export function isDevelopment(): boolean {
  return env.NODE_ENV === 'development';
}

export function isTest(): boolean {
  return env.NODE_ENV === 'test';
}

export function isProduction(): boolean {
  return env.NODE_ENV === 'production';
}

export function isStaging(): boolean {
  return env.NODE_ENV === 'staging';
}

// Configuration validation
export function validateConfiguration(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required environment variables
  if (!env.DATABASE_URL) {
    errors.push('DATABASE_URL is required');
  }

  if (!env.SUPABASE_URL) {
    errors.push('SUPABASE_URL is required');
  }

  if (!env.SUPABASE_KEY) {
    errors.push('SUPABASE_KEY is required');
  }

  // Security validations
  if (env.JWT_SECRET && env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long');
  }

  // Port validations
  if (env.PORT < 1 || env.PORT > 65535) {
    errors.push('PORT must be between 1 and 65535');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Log configuration summary (without sensitive data)
export function logConfigurationSummary(): void {
  console.log('🔧 Configuration loaded successfully');
  console.log(`📍 Environment: ${env.NODE_ENV}`);
  console.log(`🚪 Port: ${env.PORT}`);
  console.log(`🗄️ Database: Configured`);
  console.log(`🔒 Security: ${appConfig.security.rateLimiting.enabled ? 'Rate limiting enabled' : 'Rate limiting disabled'}`);
  console.log(`📊 Monitoring: ${appConfig.monitoring.metrics.enabled ? 'Metrics enabled' : 'Metrics disabled'}`);
  console.log(`✨ Features: ${Object.entries(appConfig.features).filter(([_, enabled]) => enabled).map(([key]) => key).join(', ')}`);
}
