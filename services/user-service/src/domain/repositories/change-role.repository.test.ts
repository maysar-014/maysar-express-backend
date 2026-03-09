import type { IChangeRoleRepository } from './change-role.repository';

describe('IChangeRoleRepository port', () => {
  it('updates role for user', async () => {
    const repo: IChangeRoleRepository = {
      updateRole: jest.fn().mockResolvedValue(undefined)
    };

    await repo.updateRole('user-2', 'seller');
    expect(repo.updateRole).toHaveBeenCalledWith('user-2', 'seller');
  });
});
