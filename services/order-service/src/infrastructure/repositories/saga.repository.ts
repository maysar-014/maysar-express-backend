import { PrismaSagaLogRepository } from '@shared/saga/saga-log.repository';
import { ISagaLogRepository } from '@shared/saga/saga.log';
import { databaseManager } from '../../config/database.config';

let sagaLogRepositoryInstance: PrismaSagaLogRepository | null = null;

function getSagaLogRepositoryInstance(): PrismaSagaLogRepository {
  if (!sagaLogRepositoryInstance) {
    sagaLogRepositoryInstance = new PrismaSagaLogRepository(databaseManager.getPrisma());
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
