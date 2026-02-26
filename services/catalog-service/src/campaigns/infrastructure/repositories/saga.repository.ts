import { PrismaSagaLogRepository } from '@shared/saga/saga-log.repository';
import { prisma } from '../database/prisma-client';

export const sagaLogRepository = new PrismaSagaLogRepository(prisma);
