import { MetricsCacheService } from '../MetricsCacheService';

describe('MetricsCacheService', () => {
    let cache: MetricsCacheService;

    beforeEach(() => {
        jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
        cache = new MetricsCacheService();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('generates deterministic keys and stores values', () => {
        const key = cache.generateKey('seller-1', 'gmv', 'weekly');
        cache.set(key, { total: 1200 }, { ttl: 60 });

        expect(key).toBe('seller-metrics:seller-1:gmv:weekly');
        expect(cache.get(key)).toEqual({ total: 1200 });
    });

    it('expires entries and supports pattern invalidation', () => {
        cache.set('seller-metrics:s1:a', 1, { ttl: 1 });
        cache.set('seller-metrics:s1:b', 2, { ttl: 60 });
        cache.set('other:s2:c', 3, { ttl: 60 });

        jest.advanceTimersByTime(1001);
        expect(cache.get('seller-metrics:s1:a')).toBeNull();

        cache.invalidate('seller-metrics:s1');
        expect(cache.get('seller-metrics:s1:b')).toBeNull();
        expect(cache.get('other:s2:c')).toBe(3);
    });

    it('computes once and reuses cached values via getOrCompute', async () => {
        const compute = jest.fn().mockResolvedValue({ score: 88 });
        const key = 'seller-metrics:s1:score:monthly';

        const first = await cache.getOrCompute(key, compute, { ttl: 60 });
        const second = await cache.getOrCompute(key, compute, { ttl: 60 });

        expect(first).toEqual({ score: 88 });
        expect(second).toEqual({ score: 88 });
        expect(compute).toHaveBeenCalledTimes(1);

        cache.clear();
        expect(cache.get(key)).toBeNull();
    });
});
