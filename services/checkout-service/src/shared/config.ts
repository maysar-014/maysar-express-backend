/**
 * Configuration
 * Application configuration management
 */

export interface Config {
  app: {
    name: string;
    version: string;
    port: number;
    env: string;
  };
  database: {
    url: string;
  };
  pricing: {
    taxRate: number;
    shippingCost: number;
    minOrderForFreeShipping: number;
  };
  checkout: {
    sessionExpirationMs: number;
    maxRetries: number;
    timeoutMs: number;
  };
  logging: {
    level: string;
  };
}

export const config: Config = {
  app: {
    name: 'checkout-service',
    version: '1.0.0',
    port: parseInt(process.env.PORT || '3008', 10),
    env: process.env.NODE_ENV || 'development'
  },
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost/checkout'
  },
  pricing: {
    taxRate: parseFloat(process.env.TAX_RATE || '0.1'),
    shippingCost: parseFloat(process.env.SHIPPING_COST || '10'),
    minOrderForFreeShipping: parseFloat(process.env.MIN_ORDER_FREE_SHIPPING || '100')
  },
  checkout: {
    sessionExpirationMs: parseInt(process.env.SESSION_EXPIRATION_MS || '3600000', 10),
    maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
    timeoutMs: parseInt(process.env.TIMEOUT_MS || '30000', 10)
  },
  logging: {
    level: process.env.LOG_LEVEL || 'INFO'
  }
};
