import { BuyBoxEngine } from './buy-box.engine';
import { BuyBoxWeights } from '../value-objects/buy-box-weights.value-object';
import { SellerListingInput } from '../value-objects/seller-listing-input.value-object';

const listing = (overrides: Partial<SellerListingInput>): SellerListingInput => ({
  sellerId: overrides.sellerId || 'seller-default',
  price: overrides.price ?? 100,
  rating: overrides.rating ?? 4.5,
  stock: overrides.stock ?? 8,
  matchConfidence: overrides.matchConfidence ?? 0.95,
  isSuspended: overrides.isSuspended ?? false,
  lastUpdated: overrides.lastUpdated ?? new Date('2026-03-08T10:00:00.000Z'),
  isNewSeller: overrides.isNewSeller ?? false,
  recencyBoost: overrides.recencyBoost ?? false
});

describe('BuyBoxEngine', () => {
  it('returns null when there are no eligible listings', () => {
    const result = BuyBoxEngine.compute(
      'product-1',
      [
        listing({ sellerId: 's1', stock: 0 }),
        listing({ sellerId: 's2', isSuspended: true }),
        listing({ sellerId: 's3', matchConfidence: 0.4 })
      ],
      BuyBoxWeights.defaults()
    );

    expect(result).toBeNull();
  });

  it('uses tie-breaker by recency when scores are equal', () => {
    const result = BuyBoxEngine.compute(
      'product-2',
      [
        listing({
          sellerId: 'older',
          price: 100,
          rating: 4.5,
          stock: 10,
          lastUpdated: new Date('2026-03-08T09:00:00.000Z')
        }),
        listing({
          sellerId: 'newer',
          price: 100,
          rating: 4.5,
          stock: 10,
          lastUpdated: new Date('2026-03-08T11:00:00.000Z')
        })
      ],
      BuyBoxWeights.defaults()
    );

    expect(result).not.toBeNull();
    expect(result?.primarySellerId).toBe('newer');
    expect(result?.alternatives[0]).toEqual(
      expect.objectContaining({
        sellerId: 'older',
        rank: 2
      })
    );
  });

  it('applies boost flags and caps alternatives to maximum configured count', () => {
    const listings: SellerListingInput[] = [
      listing({ sellerId: 'boosted', isNewSeller: true, recencyBoost: true, rating: 4.2, stock: 9 }),
      listing({ sellerId: 's1', rating: 5, stock: 10, price: 102 }),
      listing({ sellerId: 's2', rating: 4.8, stock: 10, price: 103 }),
      listing({ sellerId: 's3', rating: 4.7, stock: 10, price: 104 }),
      listing({ sellerId: 's4', rating: 4.6, stock: 10, price: 105 }),
      listing({ sellerId: 's5', rating: 4.5, stock: 10, price: 106 }),
      listing({ sellerId: 's6', rating: 4.4, stock: 10, price: 107 })
    ];

    const result = BuyBoxEngine.compute(
      'product-3',
      listings,
      BuyBoxWeights.fromConfig({ price: 0.4, rating: 0.4, availability: 0.2 })
    );

    expect(result).not.toBeNull();
    expect(result?.alternatives.length).toBe(5);
    expect(result?.alternatives[0].rank).toBe(2);
    expect(result?.alternatives[4].rank).toBe(6);
  });

  it('surfaces anomaly flags for suspicious stock spikes', () => {
    const result = BuyBoxEngine.compute(
      'product-4',
      [
        listing({ sellerId: 'normal', price: 1000, stock: 10 }),
        listing({ sellerId: 'spike', price: 999, stock: 1000000 })
      ],
      BuyBoxWeights.defaults()
    );

    expect(result).not.toBeNull();
    expect(result?.anomalyFlags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          signalName: 'stockReliability'
        })
      ])
    );
  });
});
