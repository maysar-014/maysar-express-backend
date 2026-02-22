import { OptimisticLock } from './optimistic-lock';

describe('OptimisticLock', () => {
  let lock: OptimisticLock;

  beforeEach(() => {
    lock = new OptimisticLock();
  });

  it('should acquire lock successfully', () => {
    const result = lock.acquire('resource-1', 1);
    expect(result).toBe(true);
  });

  it('should fail on version mismatch', () => {
    lock.acquire('resource-1', 1);
    const result = lock.acquire('resource-1', 1);
    expect(result).toBe(false);
  });

  it('should release lock', () => {
    lock.acquire('resource-1', 1);
    lock.release('resource-1');
    const result = lock.acquire('resource-1', 2);
    expect(result).toBe(true);
  });

  it('should handle concurrent updates', () => {
    lock.acquire('resource-1', 1);
    expect(lock.acquire('resource-1', 1)).toBe(false);
    expect(lock.acquire('resource-1', 2)).toBe(false);
  });
});
