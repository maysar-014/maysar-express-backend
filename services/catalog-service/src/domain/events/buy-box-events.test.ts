import { BuyBoxComputedEvent } from './buy-box-events';

describe('BuyBoxComputedEvent', () => {
  it('captures buy-box computation payload', () => {
    const computedAt = new Date('2026-03-08T00:00:00.000Z');
    const event = new BuyBoxComputedEvent('product-2', 'seller-2', 97.2, 4, computedAt);

    expect(event.eventType).toBe('BuyBoxComputed');
    expect(event.productId).toBe('product-2');
    expect(event.primarySellerId).toBe('seller-2');
    expect(event.primaryScore).toBe(97.2);
    expect(event.alternativeCount).toBe(4);
    expect(event.computedAt).toEqual(computedAt);
  });
});
