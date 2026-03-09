import { MarketContext } from './market-context.value-object';

describe('MarketContext', () => {
  it('reports availability based on market average price', () => {
    expect(new MarketContext(50000).isAvailable()).toBe(true);
    expect(new MarketContext(undefined).isAvailable()).toBe(false);
    expect(new MarketContext(0).isAvailable()).toBe(false);
  });

  it('calculates average competitor prices when available', () => {
    const context = new MarketContext(50000, [45000, 55000, 60000]);
    expect(context.getAverageCompetitorPrice()).toBe(53333.333333333336);
  });

  it('returns null for missing competitor prices', () => {
    expect(new MarketContext(50000, []).getAverageCompetitorPrice()).toBeNull();
    expect(new MarketContext(50000).getAverageCompetitorPrice()).toBeNull();
  });
});
