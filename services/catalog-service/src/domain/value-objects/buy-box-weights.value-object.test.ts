import { BuyBoxWeights } from './buy-box-weights.value-object';

describe('BuyBoxWeights', () => {
  it('creates defaults and partial config values', () => {
    const defaults = BuyBoxWeights.defaults();
    const partial = BuyBoxWeights.fromConfig({ price: 0.6, rating: 0.2, availability: 0.2 });

    expect(defaults.price + defaults.rating + defaults.availability).toBeCloseTo(1, 6);
    expect(partial.price).toBe(0.6);
    expect(partial.rating).toBe(0.2);
    expect(partial.availability).toBe(0.2);
  });

  it('enforces weight sum and keeps constants stable', () => {
    expect(() => new BuyBoxWeights(0.5, 0.3, 0.3)).toThrow('Weights must sum to 1.0');
    expect(BuyBoxWeights.MATCH_CONFIDENCE_THRESHOLD).toBe(0.75);
    expect(BuyBoxWeights.NEW_SELLER_BOOST).toBe(5);
    expect(BuyBoxWeights.RECENCY_BOOST).toBe(5);
    expect(BuyBoxWeights.MAX_ALTERNATIVES).toBe(5);
  });
});
