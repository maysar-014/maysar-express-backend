import { EventStore } from './event-store';
import { HealthCheck } from './health-check';
import { OptimisticLock } from './optimistic-lock';
import { TransactionManager } from './transaction-manager';

describe('Shared Utilities', () => {
  it('should define EventStore', () => {
    expect(EventStore).toBeDefined();
  });

  it('should define HealthCheck', () => {
    expect(HealthCheck).toBeDefined();
  });

  it('should define OptimisticLock', () => {
    expect(OptimisticLock).toBeDefined();
  });

  it('should define TransactionManager', () => {
    expect(TransactionManager).toBeDefined();
  });
});
