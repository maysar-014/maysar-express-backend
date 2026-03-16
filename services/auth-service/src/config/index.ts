import dotenv from 'dotenv';
import { databaseConfig } from './database.config';
import { securityConfig } from './security.config';
import { monitoringConfig } from './monitoring.config';
import { authzConfigManager, AuthorizationConfigManager } from './authorization.config';
import { googleOAuthConfig, validateGoogleOAuthConfig, initializeGoogleOAuthConfig } from './google-oauth.config';

// Load environment variables
dotenv.config();

/**
 * Main Configuration Aggregator
 * Centralizes all configuration for the Auth Service
 * Validates configuration and provides typed access
 */

// Environment validation
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'REDIS_URL'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

// Server configuration
export const config = {
  // Environment
  environment: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  isTest: process.env.NODE_ENV === 'test',

  // Server
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || '0.0.0.0',

  // Database
  database: databaseConfig,

  // Security
  security: securityConfig,

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET!,
    accessTokenExpiry: process.env.JWT_ACCESS_TOKEN_EXPIRY || '15m',
    refreshTokenExpiry: process.env.JWT_REFRESH_TOKEN_EXPIRY || '7d',
    issuer: process.env.JWT_ISSUER || 'maysar-auth-service',
    audience: process.env.JWT_AUDIENCE || 'maysar-platform'
  },

  // Password Security
  password: {
    saltRounds: parseInt(process.env.PASSWORD_SALT_ROUNDS || '12', 10),
    minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10),
    requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE === 'true',
    requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE === 'true',
    requireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS === 'true',
    requireSpecialChars: process.env.PASSWORD_REQUIRE_SPECIAL_CHARS === 'true'
  },

  // Two-Factor Authentication
  totp: {
    issuer: process.env.TOTP_ISSUER || 'Maysar',
    window: parseInt(process.env.TOTP_WINDOW || '1', 10)
  },

  // Email Configuration
  email: {
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    from: {
      address: process.env.EMAIL_FROM || 'noreply@maysar.com',
      name: process.env.EMAIL_FROM_NAME || 'Maysar Platform'
    }
  },

  // SMS Configuration
  sms: {
    provider: process.env.SMS_PROVIDER || 'africastalking',
    africastalking: {
      username: process.env.AFRICASTALKING_USERNAME,
      apiKey: process.env.AFRICASTALKING_API_KEY,
      senderId: process.env.AFRICASTALKING_SENDER_ID
    }
  },

  // Redis Cache
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB || '0', 10),
    tls: process.env.REDIS_TLS === 'true'
  },

  // CORS
  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
    credentials: process.env.CORS_CREDENTIALS === 'true'
  },

  // Logging
  logging: monitoringConfig.logging,

  // Monitoring
  monitoring: {
    metrics: {
      enabled: process.env.METRICS_ENABLED !== 'false'
    },
    healthCheck: {
      enabled: process.env.HEALTH_CHECK_ENABLED !== 'false'
    },
    apm: {
      enabled: process.env.APM_ENABLED === 'true'
    }
  },

  // Admin Configuration
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@maysar.com',
    systemUserId: process.env.SYSTEM_USER_ID || 'system-user-001'
  },

  // Feature Flags
  features: {
    twoFactor: process.env.ENABLE_TWO_FACTOR !== 'false',
    emailVerification: process.env.ENABLE_EMAIL_VERIFICATION !== 'false',
    phoneVerification: process.env.ENABLE_PHONE_VERIFICATION === 'true',
    socialLogin: process.env.ENABLE_SOCIAL_LOGIN === 'true',
    passwordReset: process.env.ENABLE_PASSWORD_RESET !== 'false'
  },

  // External Services
  // Standalone service URLs removed; all inter-module calls go through the monolith router.

  serviceDiscovery: {
    enabled: process.env.SERVICE_DISCOVERY_ENABLED !== 'false',
    services: parseServiceDiscoveryServices()
  }
};

function parseServiceDiscoveryServices(): Array<{ name: string; url: string }> {
  const baseUrl = (process.env.BASE_URL || process.env.PLATFORM_BASE_URL || '').trim();
  const names = (process.env.SERVICE_DISCOVERY_SERVICE_NAMES || '').split(',').map(name => name.trim()).filter(Boolean);
  if (!baseUrl || names.length === 0) {
    const host = process.env.HOST || '0.0.0.0';
    const port = parseInt(process.env.PORT || '3001', 10);
    const fallbackUrl = `http://${host}:${port}`;
    return [{ name: 'auth-service', url: fallbackUrl }];
  }

  return names.map(rawName => {
    const name = rawName.includes('-service') ? rawName : `${rawName}-service`;
    const slug = name.replace(/-service$/, '');
    return { name, url: `${baseUrl.replace(/\/$/, '')}/api/${slug}` };
  });
}

/**
 * Configuration Validation
 * Ensures all required configuration is present and valid
 */
export function validateConfiguration(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // JWT Secret validation
  if (config.jwt.secret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long');
  }

  // Database URL validation
  if (!config.database.url) {
    errors.push('DATABASE_URL is required');
  }

  // Redis URL validation
  if (!config.redis.url) {
    errors.push('REDIS_URL is required');
  }

  // Email configuration validation
  if (config.features.emailVerification && !config.email.smtp.user) {
    errors.push('SMTP_USER is required when email verification is enabled');
  }

  // SMS configuration validation
  if (config.features.phoneVerification && !config.sms.africastalking.apiKey) {
    errors.push('AfricasTalking credentials are required when phone verification is enabled');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Initialize Configuration
 * Called at application startup to validate configuration
 */
export function initializeConfiguration(): void {
  const validation = validateConfiguration();

  if (!validation.isValid) {
    console.error('❌ Configuration validation failed:');
    validation.errors.forEach(error => console.error(`   - ${error}`));
    process.exit(1);
  }

  console.log('✅ Configuration validation passed');

  // Log configuration summary in development
  if (config.isDevelopment) {
    console.log('🔧 Configuration Summary:');
    console.log(`   Environment: ${config.environment}`);
    console.log(`   Port: ${config.port}`);
    console.log(`   Database: ${config.database.url ? 'configured' : 'missing'}`);
    console.log(`   Redis: ${config.redis.url ? 'configured' : 'missing'}`);
    console.log(`   Features: 2FA=${config.features.twoFactor}, Email=${config.features.emailVerification}`);
  }
}
