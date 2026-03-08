export class OptimisticLockError extends Error {
  constructor(message: string = 'Optimistic lock failed - entity was modified by another transaction') {
    super(message);
    this.name = 'OptimisticLockError';
  }
}
