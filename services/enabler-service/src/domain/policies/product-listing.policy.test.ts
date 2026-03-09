import { Enabler_Status, Enabler_Tier } from '../types/enabler.types';
import { ProductListingPolicy } from './product-listing.policy';

describe('ProductListingPolicy', () => {
  const baseContext = {
    enablerTier: Enabler_Tier.SILVER,
    enablerStatus: Enabler_Status.ACTIVE,
    productStatus: 'published',
    sellerAllowsEnablers: true,
    sellerBlockedEnablers: [],
    currentListingsCount: 10
  };

  it('blocks listing for inactive enabler, unpublished product, seller block, and limit reached', () => {
    expect(
      ProductListingPolicy.canListProduct(
        { ...baseContext, enablerStatus: Enabler_Status.SUSPENDED },
        'en-1'
      )
    ).toEqual({ allowed: false, reason: 'Enabler is not active' });

    expect(
      ProductListingPolicy.canListProduct(
        { ...baseContext, productStatus: 'draft' },
        'en-1'
      )
    ).toEqual({ allowed: false, reason: 'Product is not published' });

    expect(
      ProductListingPolicy.canListProduct(
        { ...baseContext, sellerAllowsEnablers: false },
        'en-1'
      )
    ).toEqual({ allowed: false, reason: 'Seller does not allow enablers for this product' });

    expect(
      ProductListingPolicy.canListProduct(
        { ...baseContext, sellerBlockedEnablers: ['en-1'] },
        'en-1'
      )
    ).toEqual({ allowed: false, reason: 'Enabler is blocked by this seller' });

    expect(
      ProductListingPolicy.canListProduct(
        { ...baseContext, enablerTier: Enabler_Tier.BRONZE, currentListingsCount: 50 },
        'en-2'
      )
    ).toEqual({ allowed: false, reason: 'Listing limit reached for BRONZE tier' });
  });

  it('allows listing for valid context and supports unlimited platinum tier', () => {
    expect(ProductListingPolicy.canListProduct(baseContext as never, 'en-3')).toEqual({ allowed: true });
    expect(
      ProductListingPolicy.canListProduct(
        { ...baseContext, enablerTier: Enabler_Tier.PLATINUM, currentListingsCount: 100000 },
        'en-3'
      )
    ).toEqual({ allowed: true });
  });

  it('validates pricing markup boundaries', () => {
    expect(ProductListingPolicy.validatePricing(100, 90)).toBe(false);
    expect(ProductListingPolicy.validatePricing(100, 140, 0.5)).toBe(true);
    expect(ProductListingPolicy.validatePricing(100, 170, 0.5)).toBe(false);
  });
});

