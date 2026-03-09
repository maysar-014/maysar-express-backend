import { CampaignValidationError } from '../errors/campaign.errors';
import { CampaignSecurityPolicy } from './campaign-security.policy';

describe('CampaignSecurityPolicy', () => {
  it('allows admin users and seller owners to manage campaigns', () => {
    const policy = new CampaignSecurityPolicy();

    expect(policy.canManage('seller-1', 'admin-1', 'ADMIN')).toBe(true);
    expect(policy.canManage('seller-1', 'seller-1', 'SELLER')).toBe(true);
    expect(() => policy.validateAccess('seller-1', 'admin-1', 'ADMIN')).not.toThrow();
    expect(() => policy.validateAccess('seller-1', 'seller-1', 'SELLER')).not.toThrow();
  });

  it('denies unauthorized users from managing campaigns', () => {
    const policy = new CampaignSecurityPolicy();

    expect(policy.canManage('seller-1', 'seller-2', 'SELLER')).toBe(false);
    expect(() => policy.validateAccess('seller-1', 'seller-2', 'SELLER')).toThrow(CampaignValidationError);
  });
});
