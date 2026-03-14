import { CacheEngine } from './cache.engine';

describe('CacheEngine', () => {
  let cache: CacheEngine;

  beforeEach(() => {
    cache = new CacheEngine();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('stores and retrieves cached values before expiry', async () => {
    await cache.set('key-1', { id: 1 }, 5);

    await expect(cache.get<{ id: number }>('key-1')).resolves.toEqual({
      hit: true,
      value: { id: 1 }
    });
  });

  it('returns miss for expired entries and removes them', async () => {
    jest.useFakeTimers();
    const now = new Date('2026-01-01T00:00:00.000Z');
    jest.setSystemTime(now);

    await cache.set('expiring', 'value', 1);
    jest.setSystemTime(new Date(now.getTime() + 1_001));

    await expect(cache.get('expiring')).resolves.toEqual({ hit: false, value: null });
    await expect(cache.get('expiring')).resolves.toEqual({ hit: false, value: null });
  });

  it('deletes entry when ttlSeconds is zero or less', async () => {
    await cache.set('key-1', 'value', 5);
    await cache.set('key-1', 'value', 0);

    await expect(cache.get('key-1')).resolves.toEqual({ hit: false, value: null });
  });

  it('supports delete and clear', async () => {
    await cache.set('a', 1);
    await cache.set('b', 2);

    await expect(cache.delete('a')).resolves.toBe(true);
    await expect(cache.get('a')).resolves.toEqual({ hit: false, value: null });

    await cache.clear();
    await expect(cache.get('b')).resolves.toEqual({ hit: false, value: null });
  });
});
