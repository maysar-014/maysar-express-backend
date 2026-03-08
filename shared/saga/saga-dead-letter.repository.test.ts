import type { PrismaClient } from '@prisma/client';
import { PrismaSagaDeadLetterRepository } from './saga-dead-letter.repository';

describe('PrismaSagaDeadLetterRepository', () => {
  it('upserts dead-letter records with generated failedAt when absent', async () => {
    const upsert = jest.fn<Promise<void>, [Record<string, unknown>]>(async () => undefined);
    const prisma = { sagaDeadLetter: { upsert } } as unknown as PrismaClient;
    const repository = new PrismaSagaDeadLetterRepository(prisma);

    await repository.save({
      sagaId: 'saga-1',
      sagaType: 'OrderSaga',
      payload: { orderId: 'order-1' },
      lastError: 'payment failed',
      reason: 'max-retries-exceeded'
    });

    expect(upsert).toHaveBeenCalledTimes(1);
    const firstCall = upsert.mock.calls[0][0] as {
      where: Record<string, unknown>;
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    };
    expect(firstCall.where).toEqual({ sagaId: 'saga-1' });
    expect(firstCall.create).toEqual(
      expect.objectContaining({
        sagaId: 'saga-1',
        sagaType: 'OrderSaga',
        payload: { orderId: 'order-1' },
        lastError: 'payment failed',
        reason: 'max-retries-exceeded',
        failedAt: expect.any(Date)
      })
    );
    expect(firstCall.update).toEqual(
      expect.objectContaining({
        lastError: 'payment failed',
        reason: 'max-retries-exceeded',
        failedAt: expect.any(Date)
      })
    );
  });

  it('preserves explicit failedAt values when provided', async () => {
    const upsert = jest.fn<Promise<void>, [Record<string, unknown>]>(async () => undefined);
    const prisma = { sagaDeadLetter: { upsert } } as unknown as PrismaClient;
    const repository = new PrismaSagaDeadLetterRepository(prisma);
    const failedAt = new Date('2026-03-07T12:00:00.000Z');

    await repository.save({
      sagaId: 'saga-2',
      sagaType: 'InventorySaga',
      payload: { reservationId: 'res-1' },
      lastError: 'stock conflict',
      reason: 'irrecoverable-business-rule',
      failedAt
    });

    const firstCall = upsert.mock.calls[0][0] as { create: { failedAt: Date }; update: { failedAt: Date } };
    expect(firstCall.create.failedAt).toEqual(failedAt);
    expect(firstCall.update.failedAt).toEqual(failedAt);
  });
});
