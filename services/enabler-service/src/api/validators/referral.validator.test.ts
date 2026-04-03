import { generateReferralBodySchema } from './referral.validator';

describe('referral.validator', () => {
  it('rejects campaign names with leading control characters', () => {
    const { error } = generateReferralBodySchema.validate({
      campaignName: '\nRamadan Promo'
    });

    expect(error).toBeDefined();
  });
});
