import { TrainingCacheService } from './training-cache.service';

describe('TrainingCacheService', () => {
  it('returns null on get and resolves set operation', async () => {
    const cache = new TrainingCacheService();

    await expect(cache.get('key-1')).resolves.toBeNull();
    await expect(cache.set('key-1', { value: 1 }, 60)).resolves.toBeUndefined();
  });
});
