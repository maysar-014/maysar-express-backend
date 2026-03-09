import { IdempotencyService } from './idempotency.service';
import { IdempotencyKey } from '../../domain/value-objects/idempotency-key.value-object';

describe('IdempotencyService', () => {
  it('returns parsed cached result when key exists', async () => {
    const repository = {
      get: jest.fn().mockResolvedValue(JSON.stringify({ id: 'tx-1', status: 'ok' })),
      save: jest.fn()
    };
    const service = new IdempotencyService(repository as never);

    const result = await service.checkIdempotency<{ id: string; status: string }>(IdempotencyKey.create('key-1'));

    expect(repository.get).toHaveBeenCalledWith('key-1');
    expect(result).toEqual({ id: 'tx-1', status: 'ok' });
  });

  it('returns null when key is not cached and stores new result', async () => {
    const repository = {
      get: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue(undefined)
    };
    const service = new IdempotencyService(repository as never);
    const key = IdempotencyKey.create('key-2');

    const result = await service.checkIdempotency(key);
    await service.storeResult(key, { success: true });

    expect(result).toBeNull();
    expect(repository.save).toHaveBeenCalledWith('key-2', JSON.stringify({ success: true }));
  });
});
