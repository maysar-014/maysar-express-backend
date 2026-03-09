import type { IMailerAdapter } from './mailer.port';

describe('IMailerAdapter contract', () => {
  it('supports verification and verified mail signatures', async () => {
    const adapter: IMailerAdapter = {
      sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
      sendBusinessVerifiedEmail: jest.fn().mockResolvedValue(undefined)
    };

    await expect(
      adapter.sendVerificationEmail({
        to: 'owner@example.com',
        businessName: 'Acme',
        businessId: 'biz-1',
        verificationLink: 'https://verify.test/biz-1'
      })
    ).resolves.toBeUndefined();

    await expect(
      adapter.sendBusinessVerifiedEmail({
        to: 'owner@example.com',
        businessName: 'Acme',
        businessId: 'biz-1'
      })
    ).resolves.toBeUndefined();
  });
});
