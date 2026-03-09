import type { ISuspendAccountRepository } from './suspend-account.repository';

describe('ISuspendAccountRepository port', () => {
  it('updates account status for user id', async () => {
    const repo: ISuspendAccountRepository = {
      updateStatus: jest.fn().mockResolvedValue(undefined)
    };

    await repo.updateStatus('user-2', 'suspended');
    expect(repo.updateStatus).toHaveBeenCalledWith('user-2', 'suspended');
  });
});
