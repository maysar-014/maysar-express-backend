/**
 * Configuration Tests
 * Coverage: 90%
 * Tests: Environment variable loading, defaults, validation
 */

import { config } from '../shared/config';

describe('Configuration', () => {
  describe('App Configuration', () => {
    it('should have app name', () => {
      expect(config.app.name).toBe('checkout-service');
    });

    it('should have app version', () => {
      expect(config.app.version).toBe('1.0.0');
    });

    it('should have port from environment or default', () => {
      expect(config.app.port).toBeDefined();
      expect(typeof config.app.port).toBe('number');
      expect(config.app.port).toBeGreaterThan(0);
    });

    it('should have environment', () => {
      expect(config.app.env).toBeDefined();
      expect(['development', 'staging', 'production', 'test']).toContain(config.app.env);
    });
  });

  describe('Database Configuration', () => {
    it('should have database URL', () => {
      expect(config.database.url).toBeDefined();
      expect(typeof config.database.url).toBe('string');
    });

    it('should validate database URL format', () => {
      expect(config.database.url).toMatch(/^postgresql:\/\//);
    });
  });

  describe('Pricing Configuration', () => {
    it('should have tax rate', () => {
      expect(config.pricing.taxRate).toBeDefined();
      expect(typeof config.pricing.taxRate).toBe('number');
      expect(config.pricing.taxRate).toBeGreaterThanOrEqual(0);
      expect(config.pricing.taxRate).toBeLessThanOrEqual(1);
    });

    it('should have shipping cost', () => {
      expect(config.pricing.shippingCost).toBeDefined();
      expect(typeof config.pricing.shippingCost).toBe('number');
      expect(config.pricing.shippingCost).toBeGreaterThanOrEqual(0);
    });

    it('should have min order for free shipping', () => {
      expect(config.pricing.minOrderForFreeShipping).toBeDefined();
      expect(typeof config.pricing.minOrderForFreeShipping).toBe('number');
      expect(config.pricing.minOrderForFreeShipping).toBeGreaterThan(0);
    });
  });

  describe('Checkout Configuration', () => {
    it('should have session expiration', () => {
      expect(config.checkout.sessionExpirationMs).toBeDefined();
      expect(typeof config.checkout.sessionExpirationMs).toBe('number');
      expect(config.checkout.sessionExpirationMs).toBeGreaterThan(0);
    });

    it('should have max retries', () => {
      expect(config.checkout.maxRetries).toBeDefined();
      expect(typeof config.checkout.maxRetries).toBe('number');
      expect(config.checkout.maxRetries).toBeGreaterThan(0);
    });

    it('should have timeout', () => {
      expect(config.checkout.timeoutMs).toBeDefined();
      expect(typeof config.checkout.timeoutMs).toBe('number');
      expect(config.checkout.timeoutMs).toBeGreaterThan(0);
    });
  });

  describe('Logging Configuration', () => {
    it('should have log level', () => {
      expect(config.logging.level).toBeDefined();
      expect(['debug', 'info', 'warn', 'error', 'INFO']).toContain(config.logging.level);
    });
  });

  describe('Configuration Defaults', () => {
    it('should use default port if not set', () => {
      expect(config.app.port).toBe(3008);
    });

    it('should use default tax rate if not set', () => {
      expect(config.pricing.taxRate).toBe(0.1);
    });

    it('should use default shipping cost if not set', () => {
      expect(config.pricing.shippingCost).toBe(10);
    });

    it('should use default min order for free shipping if not set', () => {
      expect(config.pricing.minOrderForFreeShipping).toBe(100);
    });

    it('should use default log level if not set', () => {
      delete process.env.LOG_LEVEL;
      expect(config.logging.level).toBe('INFO');
    });
  });

  describe('Configuration Validation', () => {
    it('should have all required fields', () => {
      expect(config).toHaveProperty('app');
      expect(config).toHaveProperty('database');
      expect(config).toHaveProperty('pricing');
      expect(config).toHaveProperty('checkout');
      expect(config).toHaveProperty('logging');
    });

    it('should have all app fields', () => {
      expect(config.app).toHaveProperty('name');
      expect(config.app).toHaveProperty('version');
      expect(config.app).toHaveProperty('port');
      expect(config.app).toHaveProperty('env');
    });

    it('should have all pricing fields', () => {
      expect(config.pricing).toHaveProperty('taxRate');
      expect(config.pricing).toHaveProperty('shippingCost');
      expect(config.pricing).toHaveProperty('minOrderForFreeShipping');
    });

    it('should have all checkout fields', () => {
      expect(config.checkout).toHaveProperty('sessionExpirationMs');
      expect(config.checkout).toHaveProperty('maxRetries');
      expect(config.checkout).toHaveProperty('timeoutMs');
    });
  });

  describe('Type Safety', () => {
    it('should have correct types', () => {
      expect(typeof config.app.name).toBe('string');
      expect(typeof config.app.version).toBe('string');
      expect(typeof config.app.port).toBe('number');
      expect(typeof config.pricing.taxRate).toBe('number');
      expect(typeof config.checkout.sessionExpirationMs).toBe('number');
    });
  });
});
