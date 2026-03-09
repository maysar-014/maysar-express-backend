import type { ISetupTwoFactorRepository } from './setup-two-factor.repository';

describe('ISetupTwoFactorRepository port', () => {
  it('stores two-factor setup configuration', async () => {
    const repo: ISetupTwoFactorRepository = {
      setupTwoFactor: jest.fn().mockResolvedValue(undefined)
    };
    const config = {
      method: 'totp' as const,
      secret: 'secret-1',
      backupCodes: ['b1', 'b2'],
      enabled: true
    };

    await repo.setupTwoFactor('user-4', config);
    expect(repo.setupTwoFactor).toHaveBeenCalledWith('user-4', config);
  });
});
