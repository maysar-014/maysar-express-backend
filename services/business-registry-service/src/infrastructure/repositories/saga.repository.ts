import { PrismaSagaLogRepository } from '@shared/saga/saga-log.repository';
import { getPrismaClient } from '../database/prisma-client';

export const sagaLogRepository = new PrismaSagaLogRepository(getPrismaClient());
