import { ProductMatchingEngine } from './product-matching.engine';
import { Enabler_Tier } from '../types/enabler.types';

describe('ProductMatchingEngine', () => {
  const enabler = {
    id: 'enabler-1',
    tier: Enabler_Tier.GOLD,
    categoryExpertise: ['electronics'],
    location: 'Dar es Salaam',
    performanceScore: 90
  };

  const products = [
    {
      id: 'product-1',
      categoryId: 'electronics',
      sellerId: 'seller-1',
      price: 500,
      location: 'Dar es Salaam'
    },
    {
      id: 'product-2',
      categoryId: 'fashion',
      sellerId: 'seller-2',
      price: 150,
      location: 'Arusha'
    }
  ];

  it('matches and sorts products by descending score with transparent reasons', () => {
    const matches = ProductMatchingEngine.matchProducts(enabler, products);

    expect(matches).toHaveLength(2);
    expect(matches[0].productId).toBe('product-1');
    expect(matches[0].matchScore).toBeGreaterThan(matches[1].matchScore);
    expect(matches[0].reasons).toEqual(
      expect.arrayContaining(['Expertise in product category', 'Same location as seller', 'Premium tier access'])
    );
  });

  it('filters products by seller policies', () => {
    const policies = new Map([
      ['seller-1', { allowsEnablers: true }],
      ['seller-2', { allowsEnablers: false }]
    ]);

    const filtered = ProductMatchingEngine.filterBySellerPolicies(products, policies);

    expect(filtered).toEqual([products[0]]);
  });

  it('returns top N recommendations', () => {
    const recommendations = ProductMatchingEngine.recommend(enabler, products, 1);

    expect(recommendations).toHaveLength(1);
    expect(recommendations[0].productId).toBe('product-1');
  });

  it('enforces listing rules based on seller policy', () => {
    const blocked = ProductMatchingEngine.canListProduct(enabler, products[0], {
      allowsEnablers: true,
      blockedEnablers: ['enabler-1']
    });
    expect(blocked).toEqual({ canList: false, reason: 'Enabler is blocked by seller' });

    const lowTier = ProductMatchingEngine.canListProduct(
      { ...enabler, tier: Enabler_Tier.BRONZE },
      products[0],
      { allowsEnablers: true, enablerTierRequired: Enabler_Tier.SILVER }
    );
    expect(lowTier.canList).toBe(false);
    expect(lowTier.reason).toContain('Requires SILVER tier or higher');

    const categoryRestricted = ProductMatchingEngine.canListProduct(enabler, products[1], {
      allowsEnablers: true,
      categoryRestrictions: ['electronics']
    });
    expect(categoryRestricted).toEqual({ canList: false, reason: 'Product category not allowed' });

    const allowed = ProductMatchingEngine.canListProduct(enabler, products[0], {
      allowsEnablers: true,
      enablerTierRequired: Enabler_Tier.SILVER,
      categoryRestrictions: ['electronics']
    });
    expect(allowed).toEqual({ canList: true });
  });
});
