import { OptimisticLockError } from './optimistic-lock.error';

describe('OptimisticLockError', () => {
  it('uses default message when none is provided', () => {
    const error = new OptimisticLockError();

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('OptimisticLockError');
    expect(error.message).toBe('Optimistic lock failed - entity was modified by another transaction');
  });

  it('uses custom message when provided', () => {
    const error = new OptimisticLockError('version mismatch');

    expect(error.message).toBe('version mismatch');
  });
});
