import { TransactionManager } from './transaction-manager';

describe('TransactionManager', () => {
  let manager: TransactionManager;

  beforeEach(() => {
    manager = new TransactionManager();
  });

  it('should execute transaction successfully', async () => {
    const result = await manager.execute(async () => {
      return 'success';
    });
    expect(result).toBe('success');
  });

  it('should rollback on error', async () => {
    await expect(
      manager.execute(async () => {
        throw new Error('Transaction failed');
      })
    ).rejects.toThrow('Transaction failed');
  });

  it('should handle nested transactions', async () => {
    const result = await manager.execute(async () => {
      return await manager.execute(async () => 'nested');
    });
    expect(result).toBe('nested');
  });
});
