import {
  ProductCreatedEvent,
  ProductDomainEvent,
  ProductPublishedEvent,
  ProductStatusChangedEvent
} from './product-events';
import { ProductStatus, ProductType, ProductVisibility } from '../value-objects/product-types.value-object';

describe('product-events', () => {
  it('creates product created event with expected metadata', () => {
    const aggregateId = { toString: () => 'prod-1' } as never;
    const sellerId = { toString: () => 'seller-1' } as never;
    const occurredAt = new Date('2026-03-08T00:00:00.000Z');

    const event = new ProductCreatedEvent(
      'evt-1',
      aggregateId,
      sellerId,
      'Running Shoes',
      'Comfortable running shoes',
      ProductType.PHYSICAL,
      ProductVisibility.PUBLIC,
      undefined,
      occurredAt
    );

    expect(event.eventType).toBe('ProductCreated');
    expect(event.eventId).toBe('evt-1');
    expect(event.occurredAt).toEqual(occurredAt);
    expect(event.name).toBe('Running Shoes');
  });

  it('creates status and publication events with stable event types', () => {
    const aggregateId = { toString: () => 'prod-2' } as never;
    const sellerId = { toString: () => 'seller-2' } as never;

    const statusEvent = new ProductStatusChangedEvent(
      'evt-2',
      aggregateId,
      sellerId,
      ProductStatus.DRAFT,
      ProductStatus.PUBLISHED,
      'admin'
    );
    const publishedEvent = new ProductPublishedEvent(
      'evt-3',
      aggregateId,
      sellerId,
      'admin'
    );

    expect(statusEvent.eventType).toBe('ProductStatusChanged');
    expect(statusEvent.previousStatus).toBe(ProductStatus.DRAFT);
    expect(statusEvent.newStatus).toBe(ProductStatus.PUBLISHED);
    expect(publishedEvent.eventType).toBe('ProductPublished');
    expect(publishedEvent.publishedBy).toBe('admin');
    expect(statusEvent).toBeInstanceOf(ProductDomainEvent);
  });
});
