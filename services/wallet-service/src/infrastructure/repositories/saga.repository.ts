import { PrismaSagaLogRepository } from '@shared/saga/saga-log.repository';
import { ISagaLogRepository } from '@shared/saga/saga.log';

export const provideSagaLogRepository = (prisma: any): ISagaLogRepository => {
    return new PrismaSagaLogRepository(prisma);
};
