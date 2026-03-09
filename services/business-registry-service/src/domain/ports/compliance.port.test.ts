import type { IComplianceAdapter } from './compliance.port';

describe('IComplianceAdapter contract', () => {
  it('supports compliance integration method signatures', async () => {
    const adapter: IComplianceAdapter = {
      notifyNewBusiness: jest.fn().mockResolvedValue(undefined),
      createKYCRecord: jest.fn().mockResolvedValue('kyc-1'),
      revokeKYCRecord: jest.fn().mockResolvedValue(undefined)
    };

    await expect(
      adapter.notifyNewBusiness({
        businessId: 'biz-1',
        ownerId: 'owner-1',
        businessType: 'SOLE_PROPRIETORSHIP',
        registrationNumber: 'REG-1',
        correlationId: 'corr-1'
      })
    ).resolves.toBeUndefined();
    await expect(
      adapter.createKYCRecord({
        businessId: 'biz-1',
        status: 'UNDER_REVIEW',
        correlationId: 'corr-1'
      })
    ).resolves.toBe('kyc-1');
    await expect(adapter.revokeKYCRecord('kyc-1', 'corr-1')).resolves.toBeUndefined();
  });
});
