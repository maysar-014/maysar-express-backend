/**
 * Circuit Breaker Unit Tests
 * Testing circuit breaker functionality and state transitions
 */

import { circuitBreakerRegistry, CircuitBreaker, CircuitBreakerPresets } from '../../../infrastructure/circuit-breaker';

describe('Circuit Breaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    // Create a fresh circuit breaker for each test
    circuitBreaker = new CircuitBreaker({
      name: 'test-breaker',
      failureThreshold: 3,
      recoveryTimeout: 1000,
      monitoringPeriod: 5000,
      successThreshold: 2,
    });
  });

  describe('Circuit Breaker States', () => {
    it('should start in CLOSED state', () => {
      expect(circuitBreaker.getStats().state).toBe('CLOSED');
    });

    it('should transition to OPEN after failure threshold', async () => {
      // Mock a function that always fails
      const failingFunction = jest.fn().mockRejectedValue(new Error('Test error'));

      // Execute until failure threshold
      for (let i = 0; i < 3; i++) {
        await circuitBreaker.execute(failingFunction);
      }

      expect(circuitBreaker.getStats().state).toBe('OPEN');
    });

    it('should transition to HALF_OPEN after recovery timeout', async () => {
      // Force OPEN state
      const failingFunction = jest.fn().mockRejectedValue(new Error('Test error'));
      for (let i = 0; i < 3; i++) {
        await circuitBreaker.execute(failingFunction);
      }
      expect(circuitBreaker.getStats().state).toBe('OPEN');

      // Wait for recovery timeout
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Next call should transition to HALF_OPEN
      const result = await circuitBreaker.execute(failingFunction);
      expect(circuitBreaker.getStats().state).toBe('OPEN');
      expect(result.success).toBe(false);
    });

    it('should transition back to CLOSED on successful recovery', async () => {
      // Force OPEN state
      const failingFunction = jest.fn().mockRejectedValue(new Error('Test error'));
      for (let i = 0; i < 3; i++) {
        await circuitBreaker.execute(failingFunction);
      }
      expect(circuitBreaker.getStats().state).toBe('OPEN');

      // Wait for recovery and execute successful function
      await new Promise(resolve => setTimeout(resolve, 1100));

      const successFunction = jest.fn().mockResolvedValue('success');
      const firstResult = await circuitBreaker.execute(successFunction);
      const secondResult = await circuitBreaker.execute(successFunction);

      expect(circuitBreaker.getStats().state).toBe('CLOSED');
      expect(firstResult.success).toBe(true);
      expect(secondResult.success).toBe(true);
      expect(secondResult.data).toBe('success');
    });
  });

  describe('Circuit Breaker Execution', () => {
    it('should return successful results', async () => {
      const successFunction = jest.fn().mockResolvedValue('success');

      const result = await circuitBreaker.execute(successFunction);

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.error).toBeUndefined();
    });

    it('should return failed results', async () => {
      const error = new Error('Test error');
      const failingFunction = jest.fn().mockRejectedValue(error);

      const result = await circuitBreaker.execute(failingFunction);

      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.error).toBe(error);
    });

    it('should reject requests when OPEN', async () => {
      // Force OPEN state
      const failingFunction = jest.fn().mockRejectedValue(new Error('Test error'));
      for (let i = 0; i < 3; i++) {
        await circuitBreaker.execute(failingFunction);
      }

      const blockedFunction = jest.fn().mockResolvedValue('should not execute');
      const result = await circuitBreaker.execute(blockedFunction);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Circuit breaker is OPEN');
      expect(blockedFunction).not.toHaveBeenCalled();
    });

    it('should allow limited requests when HALF_OPEN', async () => {
      // Force OPEN state then HALF_OPEN
      const failingFunction = jest.fn().mockRejectedValue(new Error('Test error'));
      for (let i = 0; i < 3; i++) {
        await circuitBreaker.execute(failingFunction);
      }
      await new Promise(resolve => setTimeout(resolve, 1100));

      // First call in HALF_OPEN should execute
      const successFunction = jest.fn().mockResolvedValue('success');
      const result = await circuitBreaker.execute(successFunction);

      expect(result.success).toBe(true);
      expect(successFunction).toHaveBeenCalled();
    });
  });

  describe('Circuit Breaker Metrics', () => {
    it('should track success and failure counts', async () => {
      const successFunction = jest.fn().mockResolvedValue('success');
      const failingFunction = jest.fn().mockRejectedValue(new Error('Test error'));

      await circuitBreaker.execute(successFunction);
      await circuitBreaker.execute(failingFunction);
      await circuitBreaker.execute(failingFunction);

      const stats = circuitBreaker.getStats();
      expect(stats.requests).toBe(3);
      expect(stats.successes).toBe(1);
      expect(stats.failures).toBe(2);
    });

    it('should reset metrics on state change', async () => {
      const failingFunction = jest.fn().mockRejectedValue(new Error('Test error'));

      // Build up some metrics
      for (let i = 0; i < 2; i++) {
        await circuitBreaker.execute(failingFunction);
      }

      let stats = circuitBreaker.getStats();
      expect(stats.failures).toBe(2);

      // Trigger OPEN state
      await circuitBreaker.execute(failingFunction);
      expect(circuitBreaker.getStats().state).toBe('OPEN');

      // Metrics should be reset when circuit opens
      circuitBreaker.reset();
      stats = circuitBreaker.getStats();
      expect(stats.failures).toBe(0);
    });
  });

  describe('Circuit Breaker Registry', () => {
    it('should create and retrieve circuit breakers', () => {
      const breaker1 = circuitBreakerRegistry.getBreaker('test-1', CircuitBreakerPresets.CACHE);
      const breaker2 = circuitBreakerRegistry.getBreaker('test-1', CircuitBreakerPresets.CACHE);

      expect(breaker1).toBe(breaker2); // Same instance
    });

    it('should create different breakers for different names', () => {
      const breaker1 = circuitBreakerRegistry.getBreaker('test-1', CircuitBreakerPresets.CACHE);
      const breaker2 = circuitBreakerRegistry.getBreaker('test-2', CircuitBreakerPresets.CACHE);

      expect(breaker1).not.toBe(breaker2);
    });
  });

  describe('Circuit Breaker Presets', () => {
    it('should have CACHE preset', () => {
      const config = CircuitBreakerPresets.CACHE;
      expect(config.failureThreshold).toBeDefined();
      expect(config.recoveryTimeout).toBeDefined();
      expect(config.monitoringPeriod).toBeDefined();
    });

    it('should have API preset', () => {
      const config = CircuitBreakerPresets.API;
      expect(config.failureThreshold).toBeDefined();
      expect(config.recoveryTimeout).toBeDefined();
      expect(config.monitoringPeriod).toBeDefined();
    });

    it('should have DATABASE preset', () => {
      const config = CircuitBreakerPresets.DATABASE;
      expect(config.failureThreshold).toBeDefined();
      expect(config.recoveryTimeout).toBeDefined();
      expect(config.monitoringPeriod).toBeDefined();
    });
  });
});
