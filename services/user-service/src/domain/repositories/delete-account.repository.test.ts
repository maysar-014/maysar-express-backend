import type { IDeleteAccountRepository } from './delete-account.repository';

describe('IDeleteAccountRepository port', () => {
  it('marks account as deleted', async () => {
    const repo: IDeleteAccountRepository = {
      markAsDeleted: jest.fn().mockResolvedValue(undefined)
    };

    await repo.markAsDeleted('user-3');
    expect(repo.markAsDeleted).toHaveBeenCalledWith('user-3');
  });
});
