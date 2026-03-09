import { CampaignStatus, CampaignType, DiscountType } from './enums';

describe('campaign enums', () => {
  it('defines supported campaign types, statuses, and discount types', () => {
    expect(CampaignType.FLASH_SALE).toBe('FLASH_SALE');
    expect(CampaignType.PROMOTIONAL).toBe('PROMOTIONAL');

    expect(CampaignStatus.DRAFT).toBe('DRAFT');
    expect(CampaignStatus.ACTIVE).toBe('ACTIVE');
    expect(CampaignStatus.CANCELLED).toBe('CANCELLED');

    expect(DiscountType.PERCENTAGE).toBe('PERCENTAGE');
    expect(DiscountType.FIXED_AMOUNT).toBe('FIXED_AMOUNT');
    expect(DiscountType.BUY_X_GET_Y).toBe('BUY_X_GET_Y');
  });
});
