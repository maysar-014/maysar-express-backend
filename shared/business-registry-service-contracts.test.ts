import type { BusinessRegistryService } from '../shared-contracts/business-registry-service-contracts';

describe('business-registry-service contracts', () => {
  it('supports register and verify business command/event shapes', () => {
    const register: BusinessRegistryService.Commands.RegisterBusiness = {
      ownerId: 'owner-1',
      name: 'Amina Retail',
      details: { tin: '123456' }
    };
    const verified: BusinessRegistryService.Events.BusinessVerified = {
      businessId: 'biz-1',
      verifierId: 'verifier-1',
      verifiedAt: new Date('2026-03-09T00:00:00.000Z')
    };

    expect(register.name).toBe('Amina Retail');
    expect(verified.businessId).toBe('biz-1');
  });
});
