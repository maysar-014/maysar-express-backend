import { BuyBoxResult } from './buy-box-result.value-object';

describe('BuyBoxResult', () => {
  it('creates normal result objects', () => {
    const now = new Date('2026-03-09T00:00:00.000Z');
    const result = new BuyBoxResult(
      'product-1',
      'seller-1',
      0.92,
      [{ sellerId: 'seller-2', score: 0.84, rank: 2 }],
      now
    );

    expect(result.productId).toBe('product-1');
    expect(result.primarySellerId).toBe('seller-1');
    expect(result.alternatives[0].rank).toBe(2);
    expect(result.computedAt).toBe(now);
  });

  it('provides no-eligible-sellers factory result', () => {
    const result = BuyBoxResult.noEligibleSellers('product-404');
    expect(result.productId).toBe('product-404');
    expect(result.primarySellerId).toBe('');
    expect(result.primaryScore).toBe(0);
    expect(result.alternatives).toEqual([]);
  });
});
