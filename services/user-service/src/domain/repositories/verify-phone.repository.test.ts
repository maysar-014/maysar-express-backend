import type { IVerifyPhoneRepository } from './verify-phone.repository';

describe('IVerifyPhoneRepository port', () => {
  it('updates phone verification status', async () => {
    const repo: IVerifyPhoneRepository = {
      updatePhoneVerification: jest.fn().mockResolvedValue(undefined)
    };

    await repo.updatePhoneVerification('user-1', '+255712345678', true);
    expect(repo.updatePhoneVerification).toHaveBeenCalledWith('user-1', '+255712345678', true);
  });
});
