import { ISagaLogRepository } from '@shared/saga/saga.log';
import { databaseManager } from '../../config/database.config';
import { PrismaOrderSagaLogRepository } from './prisma-order-saga-log.repository';

let sagaLogRepositoryInstance: PrismaOrderSagaLogRepository | null = null;

function getSagaLogRepositoryInstance(): PrismaOrderSagaLogRepository {
  if (!sagaLogRepositoryInstance) {
    sagaLogRepositoryInstance = new PrismaOrderSagaLogRepository(databaseManager.getPrisma());
  }

  return sagaLogRepositoryInstance;
}

export const sagaLogRepository: ISagaLogRepository = {
  save: (...args) => getSagaLogRepositoryInstance().save(...args),
  update: (...args) => getSagaLogRepositoryInstance().update(...args),
  getById: (...args) => getSagaLogRepositoryInstance().getById(...args),
  saveStep: (...args) => getSagaLogRepositoryInstance().saveStep(...args),
  updateStep: (...args) => getSagaLogRepositoryInstance().updateStep(...args),
  getSteps: (...args) => getSagaLogRepositoryInstance().getSteps(...args),
  findStuck: (...args) => getSagaLogRepositoryInstance().findStuck(...args),
};
