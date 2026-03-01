import { AppError } from './app-error';

export class OptimisticLockError extends AppError {
  constructor(entityType: string, entityId: string, expectedVersion: number) {
    super(
      `Optimistic lock conflict on ${entityType} [${entityId}]: expected version ${expectedVersion} is stale`,
      { entityType, entityId, expectedVersion },
      409
    );
    this.name = 'OptimisticLockError';
  }
}
