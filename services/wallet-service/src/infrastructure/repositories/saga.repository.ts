import { PrismaSagaLogRepository } from '@shared/saga/saga-log.repository';
import { ISagaLogRepository } from '@shared/saga/saga.log';
import { PrismaClient } from '@prisma/client';

export const provideSagaLogRepository = (prisma: PrismaClient): ISagaLogRepository => {
    return new PrismaSagaLogRepository(prisma);
};
