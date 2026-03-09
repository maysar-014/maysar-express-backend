import {
  PricingDomainEvent,
  PricingValidationFailedEvent,
  PricingValidationRequestedEvent,
  ProductPricingUpdatedEvent
} from './pricing-events';

describe('pricing-events', () => {
  it('creates pricing update event with event metadata', () => {
    const aggregateId = { toString: () => 'prod-1' } as never;
    const sellerId = { toString: () => 'seller-1' } as never;
    const price = { toNumber: () => 100 } as never;

    const event = new ProductPricingUpdatedEvent(
      'evt-price-1',
      aggregateId,
      sellerId,
      {
        basePrice: price,
        compareAtPrice: price
      },
      'admin',
      'campaign update'
    );

    expect(event.eventType).toBe('ProductPricingUpdated');
    expect(event.eventId).toBe('evt-price-1');
    expect(event.reason).toBe('campaign update');
    expect(event).toBeInstanceOf(PricingDomainEvent);
  });

  it('creates validation requested/failed events with correct types', () => {
    const aggregateId = { toString: () => 'prod-2' } as never;
    const sellerId = { toString: () => 'seller-2' } as never;
    const price = { toNumber: () => 75 } as never;

    const requested = new PricingValidationRequestedEvent(
      'evt-price-2',
      aggregateId,
      sellerId,
      {
        basePrice: price
      },
      'seller'
    );

    const failed = new PricingValidationFailedEvent(
      'evt-price-3',
      aggregateId,
      sellerId,
      {
        basePrice: price
      },
      ['margin too low'],
      'system'
    );

    expect(requested.eventType).toBe('PricingValidationRequested');
    expect(requested.requestedBy).toBe('seller');
    expect(failed.eventType).toBe('PricingValidationFailed');
    expect(failed.validationErrors).toContain('margin too low');
  });
});
