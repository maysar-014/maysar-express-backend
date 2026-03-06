/**
 * Product Domain Events
 * Pure domain events representing business facts about products
 */

import { ProductId, SellerId, CategoryId } from '../value-objects/ids.value-object';
import { ProductStatus, ProductType, ProductVisibility } from '../value-objects/product-types.value-object';

export abstract class ProductDomainEvent {
  public readonly eventId: string;
  public readonly aggregateId: ProductId;
  public readonly occurredAt: Date;
  public readonly eventVersion: number;

  constructor(
    eventId: string,
    aggregateId: ProductId,
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

export class ProductCreatedEvent extends ProductDomainEvent {
  constructor(
    eventId: string,
    aggregateId: ProductId,
    public readonly sellerId: SellerId,
    public readonly name: string,
    public readonly description: string,
    public readonly type: ProductType,
    public readonly visibility: ProductVisibility,
    public readonly categoryId?: CategoryId,
    occurredAt: Date = new Date()
  ) {
    super(eventId, aggregateId, occurredAt);
  }

  get eventType(): string {
    return 'ProductCreated';
  }
}

export class ProductUpdatedEvent extends ProductDomainEvent {
  constructor(
    eventId: string,
    aggregateId: ProductId,
    public readonly sellerId: SellerId,
    public readonly changes: Record<string, any>,
    public readonly updatedBy: string,
    occurredAt?: Date
  ) {
    super(eventId, aggregateId, occurredAt);
  }

  get eventType(): string {
    return 'ProductUpdated';
  }
}

export class ProductStatusChangedEvent extends ProductDomainEvent {
  constructor(
    eventId: string,
    aggregateId: ProductId,
    public readonly sellerId: SellerId,
    public readonly previousStatus: ProductStatus,
    public readonly newStatus: ProductStatus,
    public readonly changedBy: string,
    occurredAt?: Date
  ) {
    super(eventId, aggregateId, occurredAt);
  }

  get eventType(): string {
    return 'ProductStatusChanged';
  }
}

export class ProductPublishedEvent extends ProductDomainEvent {
  constructor(
    eventId: string,
    aggregateId: ProductId,
    public readonly sellerId: SellerId,
    public readonly publishedBy: string,
    public readonly seoData?: {
      title: string;
      description: string;
      slug: string;
    },
    occurredAt?: Date
  ) {
    super(eventId, aggregateId, occurredAt);
  }

  get eventType(): string {
    return 'ProductPublished';
  }
}

export class ProductArchivedEvent extends ProductDomainEvent {
  constructor(
    eventId: string,
    aggregateId: ProductId,
    public readonly sellerId: SellerId,
    public readonly archivedBy: string,
    public readonly reason: string,
    occurredAt?: Date
  ) {
    super(eventId, aggregateId, occurredAt);
  }

  get eventType(): string {
    return 'ProductArchived';
  }
}

export class ProductImageAddedEvent extends ProductDomainEvent {
  constructor(
    eventId: string,
    aggregateId: ProductId,
    public readonly sellerId: SellerId,
    public readonly imageId: string,
    public readonly imageUrl: string,
    public readonly addedBy: string,
    public readonly altText?: string,
    public readonly isPrimary: boolean = false,
    occurredAt?: Date
  ) {
    super(eventId, aggregateId, occurredAt);
  }

  get eventType(): string {
    return 'ProductImageAdded';
  }
}

export class ProductVariantAddedEvent extends ProductDomainEvent {
  constructor(
    eventId: string,
    aggregateId: ProductId,
    public readonly sellerId: SellerId,
    public readonly variantId: string,
    public readonly sku: string,
    public readonly name: string,
    public readonly price: number,
    public readonly attributes: Record<string, string>,
    public readonly addedBy: string,
    occurredAt?: Date
  ) {
    super(eventId, aggregateId, occurredAt);
  }

  get eventType(): string {
    return 'ProductVariantAdded';
  }
}

export class ProductVariantUpdatedEvent extends ProductDomainEvent {
  constructor(
    eventId: string,
    aggregateId: ProductId,
    public readonly sellerId: SellerId,
    public readonly variantId: string,
    public readonly changes: Record<string, any>,
    public readonly updatedBy: string,
    occurredAt?: Date
  ) {
    super(eventId, aggregateId, occurredAt);
  }

  get eventType(): string {
    return 'ProductVariantUpdated';
  }
}

export class ProductSEOUpdatedEvent extends ProductDomainEvent {
  constructor(
    eventId: string,
    aggregateId: ProductId,
    public readonly sellerId: SellerId,
    public readonly seoData: {
      title?: string;
      description?: string;
      keywords?: string[];
      slug?: string;
      metaTags?: Record<string, string>;
    },
    public readonly updatedBy: string,
    occurredAt?: Date
  ) {
    super(eventId, aggregateId, occurredAt);
  }

  get eventType(): string {
    return 'ProductSEOUpdated';
  }
}

export class ProductInventoryUpdatedEvent extends ProductDomainEvent {
  constructor(
    eventId: string,
    aggregateId: ProductId,
    public readonly sellerId: SellerId,
    public readonly variantId: string,
    public readonly previousQuantity: number,
    public readonly newQuantity: number,
    public readonly reason: string,
    public readonly updatedBy: string,
    occurredAt?: Date
  ) {
    super(eventId, aggregateId, occurredAt);
  }

  get eventType(): string {
    return 'ProductInventoryUpdated';
  }
}

export class ProductViewedEvent extends ProductDomainEvent {
  constructor(
    eventId: string,
    aggregateId: ProductId,
    public readonly sessionId: string,
    public readonly viewerId?: string,
    public readonly userAgent?: string,
    public readonly referrer?: string,
    occurredAt?: Date
  ) {
    super(eventId, aggregateId, occurredAt);
  }

  get eventType(): string {
    return 'ProductViewed';
  }
}

export class ProductCreatedWithStructuredDataEvent extends ProductDomainEvent {
  constructor(
    eventId: string,
    aggregateId: ProductId,
    public readonly sellerId: SellerId,
    public readonly slug: string,
    public readonly categorySlug: string,
    public readonly supplierLocation: string,
    public readonly brand: string,
    public readonly seoTitle: string,
    public readonly qualityScore: number,
    occurredAt?: Date
  ) {
    super(eventId, aggregateId, occurredAt);
  }

  get eventType(): string {
    return 'ProductCreatedWithStructuredData';
  }
}

export class ProductSeoPageIndexedEvent extends ProductDomainEvent {
  constructor(
    eventId: string,
    aggregateId: ProductId,
    public readonly slug: string,
    public readonly indexedAt: Date,
    occurredAt?: Date
  ) {
    super(eventId, aggregateId, occurredAt);
  }

  get eventType(): string {
    return 'ProductSeoPageIndexed';
  }
}

// Union type for all product events
export type ProductEvent =
  | ProductCreatedEvent
  | ProductUpdatedEvent
  | ProductStatusChangedEvent
  | ProductPublishedEvent
  | ProductArchivedEvent
  | ProductImageAddedEvent
  | ProductVariantAddedEvent
  | ProductVariantUpdatedEvent
  | ProductSEOUpdatedEvent
  | ProductInventoryUpdatedEvent
  | ProductViewedEvent
  | ProductCreatedWithStructuredDataEvent
  | ProductSeoPageIndexedEvent;
