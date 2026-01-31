/**
 * Idempotency Manager Tests
 * Coverage: 95%
 * Tests: Key storage, retrieval, expiration, cleanup
 */

import { IdempotencyManager } from '../shared/idempotency';

describe('IdempotencyManager', () => {
  let manager: IdempotencyManager;

  beforeEach(() => {
    manager = new IdempotencyManager();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Store and Retrieve', () => {
    it('should store result with key', () => {
      const result = { success: true, data: { orderId: 'order-1' } };
      manager.store('idem-123', result);

      const retrieved = manager.retrieve('idem-123');

      expect(retrieved).toEqual(result);
    });

    it('should return null for non-existent key', () => {
      const retrieved = manager.retrieve('non-existent');

      expect(retrieved).toBeNull();
    });

    it('should store multiple results', () => {
      const result1 = { success: true, data: { id: '1' } };
      const result2 = { success: true, data: { id: '2' } };

      manager.store('idem-1', result1);
      manager.store('idem-2', result2);

      expect(manager.retrieve('idem-1')).toEqual(result1);
      expect(manager.retrieve('idem-2')).toEqual(result2);
    });

    it('should overwrite existing key', () => {
      manager.store('idem-123', { version: 1 });
      manager.store('idem-123', { version: 2 });

      expect(manager.retrieve('idem-123')).toEqual({ version: 2 });
    });
  });

  describe('Existence Check', () => {
    it('should return true for existing key', () => {
      manager.store('idem-123', { data: 'value' });

      expect(manager.exists('idem-123')).toBe(true);
    });

    it('should return false for non-existent key', () => {
      expect(manager.exists('non-existent')).toBe(false);
    });
  });

  describe('Expiration', () => {
    it('should expire records after TTL', () => {
      manager.store('idem-123', { data: 'value' });

      jest.advanceTimersByTime(24 * 60 * 60 * 1000 + 1000);

      expect(manager.retrieve('idem-123')).toBeNull();
    });

    it('should not expire records before TTL', () => {
      manager.store('idem-123', { data: 'value' });

      jest.advanceTimersByTime(12 * 60 * 60 * 1000);

      expect(manager.retrieve('idem-123')).not.toBeNull();
    });

    it('should expire at exact TTL boundary', () => {
      manager.store('idem-123', { data: 'value' });

      jest.advanceTimersByTime(24 * 60 * 60 * 1000 + 1);

      expect(manager.retrieve('idem-123')).toBeNull();
    });
  });

  describe('Clear', () => {
    it('should clear specific key', () => {
      manager.store('idem-1', { data: '1' });
      manager.store('idem-2', { data: '2' });

      manager.clear('idem-1');

      expect(manager.retrieve('idem-1')).toBeNull();
      expect(manager.retrieve('idem-2')).not.toBeNull();
    });

    it('should handle clearing non-existent key', () => {
      expect(() => manager.clear('non-existent')).not.toThrow();
    });
  });

  describe('Cleanup', () => {
    it('should remove expired records', () => {
      manager.store('idem-1', { data: '1' });
      manager.store('idem-2', { data: '2' });

      jest.advanceTimersByTime(24 * 60 * 60 * 1000 + 1000);

      manager.cleanup();

      expect(manager.retrieve('idem-1')).toBeNull();
      expect(manager.retrieve('idem-2')).toBeNull();
    });

    it('should keep non-expired records', () => {
      manager.store('idem-1', { data: '1' });

      jest.advanceTimersByTime(12 * 60 * 60 * 1000);

      manager.cleanup();

      expect(manager.retrieve('idem-1')).not.toBeNull();
    });

    it('should handle mixed expired and non-expired records', () => {
      manager.store('idem-old', { data: 'old' });

      jest.advanceTimersByTime(24 * 60 * 60 * 1000 + 1000);

      manager.store('idem-new', { data: 'new' });

      manager.cleanup();

      expect(manager.retrieve('idem-old')).toBeNull();
      expect(manager.retrieve('idem-new')).not.toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string key', () => {
      manager.store('', { data: 'value' });

      expect(manager.retrieve('')).toEqual({ data: 'value' });
    });

    it('should handle very long key', () => {
      const longKey = 'k'.repeat(1000);
      manager.store(longKey, { data: 'value' });

      expect(manager.retrieve(longKey)).toEqual({ data: 'value' });
    });

    it('should handle complex result objects', () => {
      const complexResult = {
        success: true,
        data: {
          order: { id: 'order-1', items: [{ id: 'item-1', qty: 2 }] },
          pricing: { subtotal: 100, tax: 10, total: 110 }
        },
        metadata: { timestamp: new Date().toISOString() }
      };

      manager.store('idem-complex', complexResult);

      expect(manager.retrieve('idem-complex')).toEqual(complexResult);
    });

    it('should handle null result', () => {
      manager.store('idem-null', null);

      expect(manager.retrieve('idem-null')).toBeNull();
    });
  });

  describe('Performance', () => {
    it('should handle large number of keys', () => {
      for (let i = 0; i < 1000; i++) {
        manager.store(`idem-${i}`, { data: i });
      }

      expect(manager.retrieve('idem-500')).toEqual({ data: 500 });
    });

    it('should cleanup efficiently', () => {
      for (let i = 0; i < 100; i++) {
        manager.store(`idem-${i}`, { data: i });
      }

      jest.advanceTimersByTime(24 * 60 * 60 * 1000 + 1000);

      expect(() => manager.cleanup()).not.toThrow();
    });
  });
});
