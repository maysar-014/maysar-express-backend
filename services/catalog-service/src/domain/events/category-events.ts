/**
 * Category Domain Events
 * Pure domain events representing business facts about categories
 */

import { CategoryId, SellerId } from '../value-objects/ids.value-object';

export abstract class CategoryDomainEvent {
  public readonly eventId: string;
  public readonly aggregateId: CategoryId;
  public readonly occurredAt: Date;
  public readonly eventVersion: number;

  constructor(
    eventId: string,
    aggregateId: CategoryId,
    occurredAt: Date = new Date(),
    eventVersion: number = 1
  ) {
    this.eventId = eventId;
    this.aggregateId = aggregateId;
    this.occurredAt = occurredAt;
    this.eventVersion = eventVersion;
  }

  abstract get eventType(): string;
}

export class CategoryCreatedEvent extends CategoryDomainEvent {
  constructor(
    eventId: string,
    aggregateId: CategoryId,
    public readonly sellerId: SellerId,
    public readonly name: string,
    public readonly createdBy: string,
    public readonly description?: string,
    public readonly parentCategoryId?: CategoryId,
    public readonly displayOrder: number = 0,
    public readonly isActive: boolean = true,
    public readonly seoData?: {
      title?: string;
      description?: string;
      keywords?: string[];
      slug?: string;
    },
    occurredAt: Date = new Date()
  ) {
    super(eventId, aggregateId, occurredAt);
  }

  get eventType(): string {
    return 'CategoryCreated';
  }
}

export class CategoryUpdatedEvent extends CategoryDomainEvent {
  constructor(
    eventId: string,
    aggregateId: CategoryId,
    public readonly sellerId: SellerId,
    public readonly changes: Record<string, unknown>,
    public readonly updatedBy: string,
    occurredAt?: Date
  ) {
    super(eventId, aggregateId, occurredAt);
  }

  get eventType(): string {
    return 'CategoryUpdated';
  }
}

export class CategoryDeletedEvent extends CategoryDomainEvent {
  constructor(
    eventId: string,
    aggregateId: CategoryId,
    public readonly sellerId: SellerId,
    public readonly deletedBy: string,
    public readonly deletionReason?: string,
    occurredAt?: Date
  ) {
    super(eventId, aggregateId, occurredAt);
  }

  get eventType(): string {
    return 'CategoryDeleted';
  }
}

export class CategoryActivatedEvent extends CategoryDomainEvent {
  constructor(
    eventId: string,
    aggregateId: CategoryId,
    public readonly sellerId: SellerId,
    public readonly activatedBy: string,
    occurredAt?: Date
  ) {
    super(eventId, aggregateId, occurredAt);
  }

  get eventType(): string {
    return 'CategoryActivated';
  }
}

export class CategoryDeactivatedEvent extends CategoryDomainEvent {
  constructor(
    eventId: string,
    aggregateId: CategoryId,
    public readonly sellerId: SellerId,
    public readonly deactivatedBy: string,
    public readonly deactivationReason?: string,
    occurredAt?: Date
  ) {
    super(eventId, aggregateId, occurredAt);
  }

  get eventType(): string {
    return 'CategoryDeactivated';
  }
}

export class CategoryProductAddedEvent extends CategoryDomainEvent {
  constructor(
    eventId: string,
    aggregateId: CategoryId,
    public readonly sellerId: SellerId,
    public readonly productId: string,
    public readonly productName: string,
    public readonly addedBy: string,
    occurredAt?: Date
  ) {
    super(eventId, aggregateId, occurredAt);
  }

  get eventType(): string {
    return 'CategoryProductAdded';
  }
}

export class CategoryProductRemovedEvent extends CategoryDomainEvent {
  constructor(
    eventId: string,
    aggregateId: CategoryId,
    public readonly sellerId: SellerId,
    public readonly productId: string,
    public readonly productName: string,
    public readonly removedBy: string,
    public readonly removalReason?: string,
    occurredAt?: Date
  ) {
    super(eventId, aggregateId, occurredAt);
  }

  get eventType(): string {
    return 'CategoryProductRemoved';
  }
}

export class CategoryDisplayOrderChangedEvent extends CategoryDomainEvent {
  constructor(
    eventId: string,
    aggregateId: CategoryId,
    public readonly sellerId: SellerId,
    public readonly oldDisplayOrder: number,
    public readonly newDisplayOrder: number,
    public readonly changedBy: string,
    occurredAt?: Date
  ) {
    super(eventId, aggregateId, occurredAt);
  }

  get eventType(): string {
    return 'CategoryDisplayOrderChanged';
  }
}

export class CategoryHierarchyChangedEvent extends CategoryDomainEvent {
  constructor(
    eventId: string,
    aggregateId: CategoryId,
    public readonly sellerId: SellerId,
    public readonly changedBy: string,
    public readonly oldParentCategoryId?: CategoryId,
    public readonly newParentCategoryId?: CategoryId,
    occurredAt?: Date
  ) {
    super(eventId, aggregateId, occurredAt);
  }

  get eventType(): string {
    return 'CategoryHierarchyChanged';
  }
}

// Union type for all category events
export type CategoryEvent =
  | CategoryCreatedEvent
  | CategoryUpdatedEvent
  | CategoryDeletedEvent
  | CategoryActivatedEvent
  | CategoryDeactivatedEvent
  | CategoryProductAddedEvent
  | CategoryProductRemovedEvent
  | CategoryDisplayOrderChangedEvent
  | CategoryHierarchyChangedEvent;
