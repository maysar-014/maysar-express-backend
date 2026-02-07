import { PrismaSagaLogRepository } from '@shared/saga/saga-log.repository';
import { databaseManager } from '../../config/database.config';

export const sagaLogRepository = new PrismaSagaLogRepository(databaseManager.getPrisma());
