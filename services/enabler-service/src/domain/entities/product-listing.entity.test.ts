import { ProductListingEntity, ProductListingProps } from './product-listing.entity';
import { Enabler_ListingStatus } from '../types/enabler.types';

describe('ProductListingEntity (mapped)', () => {
  const baseProps: ProductListingProps = {
    id: 'listing-1',
    enablerId: 'enabler-1',
    productId: 'product-1',
    sellerId: 'seller-1',
    status: Enabler_ListingStatus.ACTIVE,
    visibility: true,
    customPrice: null,
    priceMarkup: 0.2,
    listingTerms: null,
    sellerApproved: true,
    sellerApprovedAt: null,
    views: 0,
    clicks: 0,
    orders: 0,
    revenue: 0,
    metadata: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    expiresAt: null
  };

  it('checks active/expired flags and seller policy constraints', () => {
    const active = ProductListingEntity.create({ ...baseProps });
    expect(active.isActive).toBe(true);
    expect(active.canBeListedByEnabler()).toBe(true);
    expect(active.respectsSellerPolicies({ requireApproval: true, minPrice: 50, maxMarkup: 0.5 })).toBe(true);
    expect(active.validateAgainstSellerRules({ allowsEnablers: false, requiresApproval: false })).toBe(false);

    const expired = ProductListingEntity.create({
      ...baseProps,
      expiresAt: new Date('2025-12-01T00:00:00.000Z')
    });
    expect(expired.isExpired()).toBe(true);
    expect(expired.isActive).toBe(false);
  });

  it('enforces state transitions and approval ownership', () => {
    const listing = ProductListingEntity.create({ ...baseProps });
    listing.pause();
    expect(listing.status).toBe(Enabler_ListingStatus.PAUSED);
    listing.activate();
    expect(listing.status).toBe(Enabler_ListingStatus.ACTIVE);
    listing.remove();
    expect(listing.status).toBe(Enabler_ListingStatus.REMOVED);

    expect(() => listing.activate()).toThrow('Cannot activate a removed listing');
    expect(() => listing.approveBySeller('other-seller')).toThrow('Only the product seller can approve this listing');
  });

  it('tracks listing metrics and pricing helpers', () => {
    const listing = ProductListingEntity.create({ ...baseProps, clicks: 2, orders: 1, revenue: 500 });
    listing.trackView();
    listing.trackClick();
    listing.trackOrder(250);
    listing.updatePricing(120, 0.15);
    listing.updateTerms({ channel: 'social' });

    expect(listing.getConversionRate()).toBeCloseTo(2 / 3, 5);
    expect(listing.hasValidPricing(100, 0.1, 0.3)).toBe(true);
    expect(listing.toPlainObject()).toEqual(expect.objectContaining({ views: 1, revenue: 750 }));
  });
});
