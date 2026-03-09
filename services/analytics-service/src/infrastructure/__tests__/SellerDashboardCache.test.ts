import { SellerDashboardCache } from '../SellerDashboardCache';

describe('SellerDashboardCache', () => {
    let cache: SellerDashboardCache;

    beforeEach(() => {
        jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
        cache = new SellerDashboardCache();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('generates keys and stores values', () => {
        const key = cache.generateKey('seller-1', 'moneySnapshot');
        cache.set(key, { amount: 300 });
        expect(key).toBe('seller-dashboard:seller-1:moneySnapshot');
        expect(cache.get(key)).toEqual({ amount: 300 });
    });

    it('expires values and invalidates by pattern', () => {
        cache.set('seller-dashboard:s1:a', { a: 1 }, 1);
        cache.set('seller-dashboard:s1:b', { b: 2 }, 60);

        jest.advanceTimersByTime(1001);
        expect(cache.get('seller-dashboard:s1:a')).toBeNull();

        cache.invalidate('seller-dashboard:s1');
        expect(cache.get('seller-dashboard:s1:b')).toBeNull();
    });

    it('uses getOrCompute cache path and clear', async () => {
        const compute = jest.fn().mockResolvedValue({ score: 97 });
        const key = 'seller-dashboard:s1:profitability';

        const one = await cache.getOrCompute(key, compute, 60);
        const two = await cache.getOrCompute(key, compute, 60);

        expect(one).toEqual({ score: 97 });
        expect(two).toEqual({ score: 97 });
        expect(compute).toHaveBeenCalledTimes(1);

        cache.clear();
        expect(cache.get(key)).toBeNull();
    });
});
