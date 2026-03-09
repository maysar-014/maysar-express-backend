import { CacheProvider } from '../cache.provider';

describe('cache.provider CacheProvider', () => {
    let provider: CacheProvider;

    beforeEach(() => {
        provider = new CacheProvider();
    });

    it('sets, gets, and checks values', async () => {
        await provider.set('k1', { value: 1 });

        expect(await provider.has('k1')).toBe(true);
        expect(await provider.get<{ value: number }>('k1')).toEqual({ value: 1 });
    });

    it('invalidates values by key pattern', async () => {
        await provider.set('seller:1:metric', 123);
        await provider.invalidate('seller:1:metric');

        expect(await provider.has('seller:1:metric')).toBe(false);
        expect(await provider.get('seller:1:metric')).toBeNull();
    });

    it('returns null for missing values', async () => {
        expect(await provider.get('missing')).toBeNull();
    });
});
