import type { IChangePasswordRepository } from './change-password.repository';

describe('IChangePasswordRepository port', () => {
  it('updates password for user id', async () => {
    const repo: IChangePasswordRepository = {
      updatePassword: jest.fn().mockResolvedValue(undefined)
    };

    await repo.updatePassword('user-1', 'hashed-password');
    expect(repo.updatePassword).toHaveBeenCalledWith('user-1', 'hashed-password');
  });
});
