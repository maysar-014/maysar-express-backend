import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Environment validation interface
interface EnvironmentConfig {
  // Application
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  SERVICE_NAME: string;

  // Database
  DATABASE_URL: string;
  POSTGRES_DB: string;
  POSTGRES_USER: string;
  POSTGRES_PASSWORD: string;

  // Redis
  REDIS_URL: string;
  REDIS_PASSWORD?: string;

  // Authentication
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;

  // CORS
  ALLOWED_ORIGINS: string[];

  // External APIs (optional)
  STRIPE_SECRET_KEY?: string;
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  AWS_REGION?: string;

  // Monitoring (optional)
  SENTRY_DSN?: string;
  LOG_LEVEL?: string;

  // Email (optional)
  SMTP_HOST?: string;
  SMTP_PORT?: number;
  SMTP_USER?: string;
  SMTP_PASS?: string;

  // Request limits
  REQUEST_SIZE_LIMIT: string;

  // Event Bus
  EVENT_BUS_PREFIX?: string;
  DEAD_LETTER_QUEUE?: string;

  // Scheduler
  SCHEDULER_LEADER_KEY?: string;
  SCHEDULER_LEADER_TTL?: number;
}

// Required environment variables
const REQUIRED_ENV_VARS = [
  'JWT_SECRET',
  'DATABASE_URL',
  'REDIS_URL'
] as const;

// Environment variable validation errors
class EnvironmentValidationError extends Error {
  constructor(missingVars: string[]) {
    super(`Missing required environment variables: ${missingVars.join(', ')}`);
    this.name = 'EnvironmentValidationError';
  }
}

// Parse and validate environment variables
function parseEnvironment(): EnvironmentConfig {
  // Check for required variables
  const missingVars: string[] = [];

  for (const varName of REQUIRED_ENV_VARS) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }

  if (missingVars.length > 0) {
    throw new EnvironmentValidationError(missingVars);
  }

  // Parse and validate configuration
  const config: EnvironmentConfig = {
    // Application
    NODE_ENV: (process.env.NODE_ENV as EnvironmentConfig['NODE_ENV']) || 'development',
    PORT: parseInt(process.env.PORT || '3000', 10),
    SERVICE_NAME: process.env.SERVICE_NAME || 'maysar-backend',

    // Database (required)
    DATABASE_URL: process.env.DATABASE_URL!,
    POSTGRES_DB: process.env.POSTGRES_DB || 'maysar_dev',
    POSTGRES_USER: process.env.POSTGRES_USER || 'maysar_user',
    POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD || '',

    // Redis (required)
    REDIS_URL: process.env.REDIS_URL!,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,

    // Authentication (required)
    JWT_SECRET: process.env.JWT_SECRET!,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',

    // CORS
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
      : ['http://localhost:3000', 'http://localhost:3001'],

    // External APIs (optional)
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_REGION: process.env.AWS_REGION || 'us-east-1',

    // Monitoring (optional)
    SENTRY_DSN: process.env.SENTRY_DSN,
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',

    // Email (optional)
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,

    // Request limits
    REQUEST_SIZE_LIMIT: process.env.REQUEST_SIZE_LIMIT || '10mb',

    // Event Bus
    EVENT_BUS_PREFIX: process.env.EVENT_BUS_PREFIX || 'events',
    DEAD_LETTER_QUEUE: process.env.DEAD_LETTER_QUEUE || 'events:dead-letter',

    // Scheduler
    SCHEDULER_LEADER_KEY: process.env.SCHEDULER_LEADER_KEY || 'scheduler:leader',
    SCHEDULER_LEADER_TTL: process.env.SCHEDULER_LEADER_TTL ? parseInt(process.env.SCHEDULER_LEADER_TTL, 10) : 30
  };

  // Additional validations
  validateConfiguration(config);

  return config;
}

// Validate configuration values
function validateConfiguration(config: EnvironmentConfig): void {
  // Validate NODE_ENV
  const validEnvs = ['development', 'production', 'test'];
  if (!validEnvs.includes(config.NODE_ENV)) {
    throw new Error(`Invalid NODE_ENV: ${config.NODE_ENV}. Must be one of: ${validEnvs.join(', ')}`);
  }

  // Validate PORT
  if (isNaN(config.PORT) || config.PORT < 1 || config.PORT > 65535) {
    throw new Error(`Invalid PORT: ${config.PORT}. Must be between 1 and 65535`);
  }

  // Validate JWT_EXPIRES_IN format (basic check)
  if (!/^(\d+[smhdw]|\d+)$/.test(config.JWT_EXPIRES_IN)) {
    throw new Error(`Invalid JWT_EXPIRES_IN format: ${config.JWT_EXPIRES_IN}`);
  }

  // Validate DATABASE_URL format (basic check)
  if (!config.DATABASE_URL.startsWith('postgresql://') && !config.DATABASE_URL.startsWith('postgres://')) {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection string');
  }

  // Validate REDIS_URL format (basic check)
  if (!config.REDIS_URL.startsWith('redis://') && !config.REDIS_URL.startsWith('rediss://')) {
    throw new Error('REDIS_URL must be a valid Redis connection string');
  }

  // Validate ALLOWED_ORIGINS (basic check)
  for (const origin of config.ALLOWED_ORIGINS) {
    try {
      new URL(origin);
    } catch {
      throw new Error(`Invalid ALLOWED_ORIGINS entry: ${origin}`);
    }
  }

  // Validate REQUEST_SIZE_LIMIT format (basic check)
  if (!/^(\d+)(mb|kb|b)$/i.test(config.REQUEST_SIZE_LIMIT)) {
    throw new Error(`Invalid REQUEST_SIZE_LIMIT format: ${config.REQUEST_SIZE_LIMIT}`);
  }
}

// Parse size strings to bytes
export function parseSize(sizeStr: string): number {
  const match = sizeStr.match(/^(\d+)(mb|kb|b)$/i);
  if (!match) return 1024 * 1024; // Default 1MB

  const [, size, unit] = match;
  const numSize = parseInt(size, 10);

  switch (unit.toLowerCase()) {
    case 'b': return numSize;
    case 'kb': return numSize * 1024;
    case 'mb': return numSize * 1024 * 1024;
    default: return numSize;
  }
}

// Cached configuration instance
let configInstance: EnvironmentConfig | null = null;

// Get validated configuration
export function getConfig(): EnvironmentConfig {
  if (!configInstance) {
    configInstance = parseEnvironment();
  }
  return configInstance;
}

// Reset configuration (useful for testing)
export function resetConfig(): void {
  configInstance = null;
}

// Check if running in specific environment
export const isDevelopment = (): boolean => getConfig().NODE_ENV === 'development';
export const isProduction = (): boolean => getConfig().NODE_ENV === 'production';
export const isTest = (): boolean => getConfig().NODE_ENV === 'test';

// Environment-specific configurations
export const getDatabaseConfig = () => ({
  url: getConfig().DATABASE_URL,
  ssl: isProduction() ? { rejectUnauthorized: false } : false,
  logging: isDevelopment()
});

export const getRedisConfig = () => ({
  url: getConfig().REDIS_URL,
  password: getConfig().REDIS_PASSWORD
});

export const getJwtConfig = () => ({
  secret: getConfig().JWT_SECRET,
  expiresIn: getConfig().JWT_EXPIRES_IN
});

export const getCorsConfig = () => ({
  origin: getConfig().ALLOWED_ORIGINS,
  credentials: true
});

export const getRequestLimits = () => {
  const limit = getConfig().REQUEST_SIZE_LIMIT;
  return {
    json: { limit },
    urlencoded: { limit, extended: true }
  };
};

// Export the configuration
export const config = getConfig();
export default config;

// Export error class for external use
export { EnvironmentValidationError };
