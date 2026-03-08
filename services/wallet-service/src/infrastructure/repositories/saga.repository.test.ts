import type { PrismaClient } from '@prisma/client';
import { PrismaSagaLogRepository } from '@shared/saga/saga-log.repository';
import { provideSagaLogRepository } from './saga.repository';

describe('provideSagaLogRepository', () => {
  it('creates a PrismaSagaLogRepository using the provided prisma client', () => {
    const prisma = {} as PrismaClient;
    const repository = provideSagaLogRepository(prisma);

    expect(repository).toBeInstanceOf(PrismaSagaLogRepository);
  });
});
