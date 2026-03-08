import type { IIdempotencyRepository } from '../../domain/repositories/idempotency.repository';
import { IdempotencyRepository } from './idempotency.repository';

describe('idempotency repository contracts', () => {
  const createPrismaMock = () => ({
    wallet_IdempotencyRecord: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn()
    }
  });

  it('satisfies domain repository interface via infrastructure implementation', () => {
    const prismaMock = createPrismaMock();
    const repository: IIdempotencyRepository = new IdempotencyRepository(prismaMock as never);

    expect(repository).toBeInstanceOf(IdempotencyRepository);
  });

  it('returns null for missing keys and expired records', async () => {
    const prismaMock = createPrismaMock();
    prismaMock.wallet_IdempotencyRecord.delete.mockResolvedValue(undefined);
    const repository = new IdempotencyRepository(prismaMock as never);

    prismaMock.wallet_IdempotencyRecord.findUnique.mockResolvedValueOnce(null);
    await expect(repository.get('k1')).resolves.toBeNull();

    prismaMock.wallet_IdempotencyRecord.findUnique.mockResolvedValueOnce({
      key: 'k2',
      result: { value: 1 },
      expiresAt: new Date(Date.now() - 1000)
    });
    await expect(repository.get('k2')).resolves.toBeNull();
    expect(prismaMock.wallet_IdempotencyRecord.delete).toHaveBeenCalledWith({ where: { key: 'k2' } });
  });

  it('returns serialized result for valid records and supports save/delete', async () => {
    const prismaMock = createPrismaMock();
    prismaMock.wallet_IdempotencyRecord.delete.mockResolvedValue(undefined);
    const repository = new IdempotencyRepository(prismaMock as never);

    prismaMock.wallet_IdempotencyRecord.findUnique.mockResolvedValueOnce({
      key: 'k3',
      result: { ok: true },
      expiresAt: new Date(Date.now() + 1000)
    });
    await expect(repository.get('k3')).resolves.toBe(JSON.stringify({ ok: true }));

    await repository.save('k4', JSON.stringify({ saved: true }));
    expect(prismaMock.wallet_IdempotencyRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          key: 'k4',
          result: { saved: true }
        })
      })
    );

    prismaMock.wallet_IdempotencyRecord.delete.mockRejectedValueOnce(new Error('missing'));
    await expect(repository.delete('k5')).resolves.toBeUndefined();
  });
});
