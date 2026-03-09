import { ListingTerms } from './listing-terms.value-object';

describe('ListingTerms', () => {
  it('creates default terms and exposes helpers', () => {
    const terms = ListingTerms.createDefault();

    expect(terms.getMinOrderQuantity()).toBe(1);
    expect(terms.getDeliveryTimeframe()).toBe('Standard');
    expect(terms.isRegionRestricted('TZ-DAR')).toBe(false);
    expect(terms.hasReturnPolicy()).toBe(false);
    expect(terms.hasWarranty()).toBe(false);
  });

  it('validates quantity and warranty constraints', () => {
    expect(() => ListingTerms.create({ minOrderQuantity: 5, maxOrderQuantity: 2 })).toThrow(
      'Minimum order quantity cannot exceed maximum'
    );
    expect(() => ListingTerms.create({ minOrderQuantity: -1 })).toThrow('Minimum order quantity must be at least 1');
    expect(() => ListingTerms.create({ warrantyPeriod: -1 })).toThrow('Warranty period cannot be negative');
  });

  it('returns new instances for modifiers and equality checks', () => {
    const base = ListingTerms.create({ minOrderQuantity: 2, restrictedRegions: ['TZ-DSM'] });
    const updated = base
      .withMaxOrderQuantity(10)
      .withDeliveryTimeframe('Express')
      .withReturnPolicy('7 days')
      .withWarranty(30)
      .addRestrictedRegion('TZ-MWZ');

    expect(base.getMaxOrderQuantity()).toBeUndefined();
    expect(updated.getMaxOrderQuantity()).toBe(10);
    expect(updated.hasReturnPolicy()).toBe(true);
    expect(updated.hasWarranty()).toBe(true);
    expect(updated.isRegionRestricted('TZ-MWZ')).toBe(true);
    expect(base.equals(updated)).toBe(false);
    expect(updated.toJSON()).toEqual(updated.getTerms());
  });
});
