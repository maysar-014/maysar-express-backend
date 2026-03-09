import {
  Enabler_ListingStatus,
  Enabler_OrderStatus,
  Enabler_Status,
  Enabler_Tier
} from './enabler.types';

describe('enabler types', () => {
  it('exposes status constants', () => {
    expect(Enabler_Status.PENDING).toBe('PENDING');
    expect(Enabler_Status.ACTIVE).toBe('ACTIVE');
    expect(Enabler_Status.REJECTED).toBe('REJECTED');
  });

  it('exposes tier and listing/order constants', () => {
    expect(Enabler_Tier.BRONZE).toBe('BRONZE');
    expect(Enabler_Tier.PLATINUM).toBe('PLATINUM');
    expect(Enabler_ListingStatus.ACTIVE).toBe('ACTIVE');
    expect(Enabler_ListingStatus.REMOVED).toBe('REMOVED');
    expect(Enabler_OrderStatus.PROCESSING).toBe('PROCESSING');
    expect(Enabler_OrderStatus.DISPUTED).toBe('DISPUTED');
  });

  it('keeps enum-like maps unique', () => {
    const statuses = Object.values(Enabler_Status);
    const tiers = Object.values(Enabler_Tier);
    expect(new Set(statuses).size).toBe(statuses.length);
    expect(new Set(tiers).size).toBe(tiers.length);
  });
});
