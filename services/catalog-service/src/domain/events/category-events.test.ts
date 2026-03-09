import {
  CategoryActivatedEvent,
  CategoryCreatedEvent,
  CategoryDeactivatedEvent,
  CategoryDeletedEvent,
  CategoryDisplayOrderChangedEvent,
  CategoryHierarchyChangedEvent,
  CategoryProductAddedEvent,
  CategoryProductRemovedEvent,
  CategoryUpdatedEvent
} from './category-events';
import { CategoryId, SellerId } from '../value-objects/ids.value-object';

describe('category-events', () => {
  const occurredAt = new Date('2026-03-08T11:30:00.000Z');
  const categoryId = CategoryId.fromString('cat-1');
  const parentId = CategoryId.fromString('parent-1');
  const sellerId = SellerId.fromString('seller-1');

  it('creates creation/update/deletion events with payload metadata', () => {
    const created = new CategoryCreatedEvent(
      'evt-cat-1',
      categoryId,
      sellerId,
      'Shoes',
      'admin',
      'All shoes',
      parentId,
      3,
      true,
      { title: 'Shoes', slug: 'shoes' },
      occurredAt
    );
    const updated = new CategoryUpdatedEvent(
      'evt-cat-2',
      categoryId,
      sellerId,
      { name: 'Running Shoes' },
      'editor',
      occurredAt
    );
    const deleted = new CategoryDeletedEvent(
      'evt-cat-3',
      categoryId,
      sellerId,
      'admin',
      'duplicate',
      occurredAt
    );

    expect(created.eventType).toBe('CategoryCreated');
    expect(created.parentCategoryId).toEqual(parentId);
    expect(updated.eventType).toBe('CategoryUpdated');
    expect(updated.changes.name).toBe('Running Shoes');
    expect(deleted.eventType).toBe('CategoryDeleted');
    expect(deleted.deletionReason).toBe('duplicate');
  });

  it('creates activation/product/order/hierarchy events with expected types', () => {
    const activated = new CategoryActivatedEvent('evt-cat-4', categoryId, sellerId, 'ops', occurredAt);
    const deactivated = new CategoryDeactivatedEvent(
      'evt-cat-5',
      categoryId,
      sellerId,
      'ops',
      'seasonal',
      occurredAt
    );
    const productAdded = new CategoryProductAddedEvent(
      'evt-cat-6',
      categoryId,
      sellerId,
      'prod-1',
      'Trail Shoe',
      'ops',
      occurredAt
    );
    const productRemoved = new CategoryProductRemovedEvent(
      'evt-cat-7',
      categoryId,
      sellerId,
      'prod-1',
      'Trail Shoe',
      'ops',
      'outdated',
      occurredAt
    );
    const displayOrderChanged = new CategoryDisplayOrderChangedEvent(
      'evt-cat-8',
      categoryId,
      sellerId,
      5,
      1,
      'ops',
      occurredAt
    );
    const hierarchyChanged = new CategoryHierarchyChangedEvent(
      'evt-cat-9',
      categoryId,
      sellerId,
      'ops',
      parentId,
      undefined,
      occurredAt
    );

    expect(activated.eventType).toBe('CategoryActivated');
    expect(deactivated.eventType).toBe('CategoryDeactivated');
    expect(productAdded.eventType).toBe('CategoryProductAdded');
    expect(productRemoved.eventType).toBe('CategoryProductRemoved');
    expect(displayOrderChanged.eventType).toBe('CategoryDisplayOrderChanged');
    expect(hierarchyChanged.eventType).toBe('CategoryHierarchyChanged');
  });
});
