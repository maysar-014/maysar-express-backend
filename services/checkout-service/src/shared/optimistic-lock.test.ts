import { OptimisticLock } from './optimistic-lock';
import { RedisLock } from '../../../../shared/locking/redis-lock';

describe('OptimisticLock', () => {
  let lock: OptimisticLock;
  let mockRedisLock: jest.Mocked<RedisLock>;

  beforeEach(() => {
    mockRedisLock = {
      acquire: jest.fn(),
      release: jest.fn(),
      withLock: jest.fn(),
      isLocked: jest.fn(),
      disconnect: jest.fn()
    } as unknown as jest.Mocked<RedisLock>;
    lock = new OptimisticLock(mockRedisLock);
  });

  it('should acquire lock successfully', async () => {
    mockRedisLock.acquire.mockResolvedValue(true);
    const result = await lock.acquire('resource-1');
    expect(result).toBe(true);
  });

  it('should fail when lock cannot be acquired', async () => {
    mockRedisLock.acquire.mockResolvedValue(false);
    const result = await lock.acquire('resource-1');
    expect(result).toBe(false);
  });

  it('should release lock', async () => {
    mockRedisLock.acquire.mockResolvedValue(true);
    await lock.acquire('resource-1');
    await lock.release('resource-1');
    expect(mockRedisLock.release).toHaveBeenCalledWith('resource-1');
  });

  it('should track held locks locally', async () => {
    mockRedisLock.acquire.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    await lock.acquire('resource-1');
    const result = await lock.acquire('resource-1');
    expect(result).toBe(false);
    expect(mockRedisLock.acquire).toHaveBeenCalledTimes(2);
  });
});
