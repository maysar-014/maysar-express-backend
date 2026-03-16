import { InMemoryCacheService, RedisCacheService } from '../cache.service';

describe('InMemoryCacheService', () => {
  let cacheService: InMemoryCacheService;

  beforeEach(() => {
    cacheService = new InMemoryCacheService();
  });

  describe('set and get', () => {
    it('should set and retrieve a value', async () => {
      await cacheService.set('key1', 'value1');
      const result = await cacheService.get('key1');
      expect(result).toBe('value1');
    });

    it('should return null for non-existent key', async () => {
      const result = await cacheService.get('non-existent');
      expect(result).toBeNull();
    });

    it('should set and retrieve complex objects', async () => {
      const obj = { id: 1, name: 'test', nested: { value: 42 } };
      await cacheService.set('obj-key', obj);
      const result = await cacheService.get('obj-key');
      expect(result).toEqual(obj);
    });

    it('should set and retrieve arrays', async () => {
      const arr = [1, 2, 3, 4, 5];
      await cacheService.set('arr-key', arr);
      const result = await cacheService.get('arr-key');
      expect(result).toEqual(arr);
    });

    it('should handle null values', async () => {
      await cacheService.set('null-key', null);
      const result = await cacheService.get('null-key');
      expect(result).toBeNull();
    });

    it('should handle undefined values', async () => {
      await cacheService.set('undefined-key', undefined);
      const result = await cacheService.get('undefined-key');
      expect(result).toBeUndefined();
    });

    it('should handle boolean values', async () => {
      await cacheService.set('bool-true', true);
      await cacheService.set('bool-false', false);
      expect(await cacheService.get('bool-true')).toBe(true);
      expect(await cacheService.get('bool-false')).toBe(false);
    });

    it('should handle numeric values', async () => {
      await cacheService.set('num-int', 42);
      await cacheService.set('num-float', 3.14);
      expect(await cacheService.get('num-int')).toBe(42);
      expect(await cacheService.get('num-float')).toBe(3.14);
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should expire value after TTL', async () => {
      jest.useFakeTimers();
      await cacheService.set('ttl-key', 'value', 1);
      expect(await cacheService.get('ttl-key')).toBe('value');

      jest.advanceTimersByTime(1100);
      expect(await cacheService.get('ttl-key')).toBeNull();

      jest.useRealTimers();
    });

    it('should not expire value before TTL', async () => {
      jest.useFakeTimers();
      await cacheService.set('ttl-key', 'value', 10);
      expect(await cacheService.get('ttl-key')).toBe('value');

      jest.advanceTimersByTime(5000);
      expect(await cacheService.get('ttl-key')).toBe('value');

      jest.useRealTimers();
    });

    it('should handle zero TTL', async () => {
      await cacheService.set('zero-ttl', 'value', 0);
      const result = await cacheService.get('zero-ttl');
      expect(result).toBe('value');
    });

    it('should handle undefined TTL (no expiration)', async () => {
      await cacheService.set('no-ttl', 'value');
      const result = await cacheService.get('no-ttl');
      expect(result).toBe('value');
    });
  });

  describe('del', () => {
    it('should delete a key', async () => {
      await cacheService.set('del-key', 'value');
      expect(await cacheService.get('del-key')).toBe('value');

      await cacheService.del('del-key');
      expect(await cacheService.get('del-key')).toBeNull();
    });

    it('should handle deleting non-existent key', async () => {
      await expect(cacheService.del('non-existent')).resolves.toBeUndefined();
    });

    it('should delete multiple keys independently', async () => {
      await cacheService.set('key1', 'value1');
      await cacheService.set('key2', 'value2');

      await cacheService.del('key1');
      expect(await cacheService.get('key1')).toBeNull();
      expect(await cacheService.get('key2')).toBe('value2');
    });
  });

  describe('exists', () => {
    it('should return true for existing key', async () => {
      await cacheService.set('exists-key', 'value');
      const result = await cacheService.exists('exists-key');
      expect(result).toBe(true);
    });

    it('should return false for non-existent key', async () => {
      const result = await cacheService.exists('non-existent');
      expect(result).toBe(false);
    });

    it('should return false for expired key', async () => {
      jest.useFakeTimers();
      await cacheService.set('expired-key', 'value', 1);
      expect(await cacheService.exists('expired-key')).toBe(true);

      jest.advanceTimersByTime(1100);
      expect(await cacheService.exists('expired-key')).toBe(false);

      jest.useRealTimers();
    });

    it('should clean up expired key when checking existence', async () => {
      jest.useFakeTimers();
      await cacheService.set('cleanup-key', 'value', 1);
      jest.advanceTimersByTime(1100);

      await cacheService.exists('cleanup-key');
      expect(await cacheService.get('cleanup-key')).toBeNull();

      jest.useRealTimers();
    });
  });

  describe('flush', () => {
    it('should clear all keys', async () => {
      await cacheService.set('key1', 'value1');
      await cacheService.set('key2', 'value2');
      await cacheService.set('key3', 'value3');

      await cacheService.flush();

      expect(await cacheService.get('key1')).toBeNull();
      expect(await cacheService.get('key2')).toBeNull();
      expect(await cacheService.get('key3')).toBeNull();
    });

    it('should handle flushing empty cache', async () => {
      await expect(cacheService.flush()).resolves.toBeUndefined();
    });
  });

  describe('increment', () => {
    it('should increment numeric value by 1', async () => {
      await cacheService.set('counter', 5);
      const result = await cacheService.increment('counter');
      expect(result).toBe(6);
      expect(await cacheService.get('counter')).toBe(6);
    });

    it('should increment by specified amount', async () => {
      await cacheService.set('counter', 10);
      const result = await cacheService.increment('counter', 5);
      expect(result).toBe(15);
      expect(await cacheService.get('counter')).toBe(15);
    });

    it('should initialize non-existent key to 0 before incrementing', async () => {
      const result = await cacheService.increment('new-counter');
      expect(result).toBe(1);
      expect(await cacheService.get('new-counter')).toBe(1);
    });

    it('should handle negative increment', async () => {
      await cacheService.set('counter', 10);
      const result = await cacheService.increment('counter', -3);
      expect(result).toBe(7);
    });

    it('should handle zero increment', async () => {
      await cacheService.set('counter', 5);
      const result = await cacheService.increment('counter', 0);
      expect(result).toBe(5);
    });

    it('should handle large increments', async () => {
      await cacheService.set('counter', 1000000);
      const result = await cacheService.increment('counter', 1000000);
      expect(result).toBe(2000000);
    });

    it('should handle sequential increments', async () => {
      await cacheService.set('counter', 0);
      for (let i = 0; i < 5; i++) {
        await cacheService.increment('counter', 1);
      }

      const final = await cacheService.get('counter');
      expect(final).toBe(5);
    });
  });

  describe('expire', () => {
    it('should set expiration on existing key', async () => {
      jest.useFakeTimers();
      await cacheService.set('expire-key', 'value');
      await cacheService.expire('expire-key', 1);

      expect(await cacheService.get('expire-key')).toBe('value');
      jest.advanceTimersByTime(1100);
      expect(await cacheService.get('expire-key')).toBeNull();

      jest.useRealTimers();
    });

    it('should handle expire on non-existent key', async () => {
      await expect(cacheService.expire('non-existent', 10)).resolves.toBeUndefined();
    });

    it('should update expiration time', async () => {
      jest.useFakeTimers();
      await cacheService.set('expire-key', 'value', 10);
      await cacheService.expire('expire-key', 1);

      jest.advanceTimersByTime(1100);
      expect(await cacheService.get('expire-key')).toBeNull();

      jest.useRealTimers();
    });
  });

  describe('Service metadata', () => {
    it('should have correct service name', () => {
      expect(cacheService.name).toBe('InMemoryCacheService');
    });
  });

  describe('Concurrent operations', () => {
    it('should handle concurrent sets and gets', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(cacheService.set(`key-${i}`, `value-${i}`));
      }
      await Promise.all(promises);

      const getPromises = [];
      for (let i = 0; i < 10; i++) {
        getPromises.push(cacheService.get(`key-${i}`));
      }
      const results = await Promise.all(getPromises);

      results.forEach((result, i) => {
        expect(result).toBe(`value-${i}`);
      });
    });
  });
});

describe('RedisCacheService', () => {
  let cacheService: RedisCacheService;

  beforeEach(() => {
    cacheService = new RedisCacheService();
  });

  describe('Configuration enforcement', () => {
    it('should have correct service name', () => {
      expect(cacheService.name).toBe('RedisCacheService');
    });

    it('should reject cache operations when not configured', async () => {
      await expect(cacheService.set('key', 'value')).rejects.toThrow('RedisCacheService is not configured');
      await expect(cacheService.get('key')).rejects.toThrow('RedisCacheService is not configured');
      await expect(cacheService.del('key')).rejects.toThrow('RedisCacheService is not configured');
      await expect(cacheService.exists('key')).rejects.toThrow('RedisCacheService is not configured');
      await expect(cacheService.flush()).rejects.toThrow('RedisCacheService is not configured');
      await expect(cacheService.increment('counter', 3)).rejects.toThrow('RedisCacheService is not configured');
      await expect(cacheService.expire('key', 1)).rejects.toThrow('RedisCacheService is not configured');
    });
  });
});
