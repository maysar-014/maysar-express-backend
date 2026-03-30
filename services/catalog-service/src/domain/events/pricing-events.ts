/**
 * Pricing Domain Events
 * Pure domain events representing business facts about pricing
 */

import { ProductId, SellerId, SupplierId } from '../value-objects/ids.value-object';
import { Price, WholesalePricing } from '../value-objects/monetary.value-object';

export abstract class PricingDomainEvent {
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

export class ProductPricingUpdatedEvent extends PricingDomainEvent {
  constructor(
    eventId: string,
    aggregateId: ProductId,
    public readonly sellerId: SellerId,
    public readonly pricing: {
      basePrice: Price;
      compareAtPrice?: Price;
      costPrice?: number;
      wholesalePricing?: WholesalePricing;
    },
    public readonly updatedBy: string,
    public readonly reason?: string,
    occurredAt?: Date
  ) {
    super(eventId, aggregateId, occurredAt);
  }

  get eventType(): string {
    return 'ProductPricingUpdated';
  }
}

export class PricingValidationRequestedEvent extends PricingDomainEvent {
  constructor(
    eventId: string,
    aggregateId: ProductId,
    public readonly sellerId: SellerId,
    public readonly requestedPricing: {
      basePrice: Price;
      compareAtPrice?: Price;
      costPrice?: number;
    },
    public readonly requestedBy: string,
    occurredAt?: Date
  ) {
    super(eventId, aggregateId, occurredAt);
  }

  get eventType(): string {
    return 'PricingValidationRequested';
  }
}

export class PricingValidationPassedEvent extends PricingDomainEvent {
  constructor(
    eventId: string,
    aggregateId: ProductId,
    public readonly sellerId: SellerId,
    public readonly validatedPricing: {
      basePrice: Price;
      compareAtPrice?: Price;
      costPrice?: number;
      margin: number;
      markup: number;
    },
    public readonly validatedBy: string,
    occurredAt?: Date
  ) {
    super(eventId, aggregateId, occurredAt);
  }

  get eventType(): string {
    return 'PricingValidationPassed';
  }
}

export class PricingValidationFailedEvent extends PricingDomainEvent {
  constructor(
    eventId: string,
    aggregateId: ProductId,
    public readonly sellerId: SellerId,
    public readonly requestedPricing: {
      basePrice: Price;
      compareAtPrice?: Price;
      costPrice?: number;
    },
    public readonly validationErrors: string[],
    public readonly validatedBy: string,
    occurredAt?: Date
  ) {
    super(eventId, aggregateId, occurredAt);
  }

  get eventType(): string {
    return 'PricingValidationFailed';
  }
}

export class WholesalePricingCalculatedEvent extends PricingDomainEvent {
  constructor(
    eventId: string,
    aggregateId: ProductId,
    public readonly supplierId: SupplierId,
    public readonly wholesalePricing: WholesalePricing,
    public readonly calculatedBy: string,
    public readonly calculationMethod: 'cost_based' | 'market_based' | 'competitor_based',
    occurredAt?: Date
  ) {
    super(eventId, aggregateId, occurredAt);
  }

  get eventType(): string {
    return 'WholesalePricingCalculated';
  }
}

export class WholesalePricingApprovedEvent extends PricingDomainEvent {
  constructor(
    eventId: string,
    aggregateId: ProductId,
    public readonly supplierId: SupplierId,
    public readonly approvedPricing: WholesalePricing,
    public readonly approvedBy: string,
    public readonly approvalReason?: string,
    occurredAt?: Date
  ) {
    super(eventId, aggregateId, occurredAt);
  }

  get eventType(): string {
    return 'WholesalePricingApproved';
  }
}

export class WholesalePricingRejectedEvent extends PricingDomainEvent {
  constructor(
    eventId: string,
    aggregateId: ProductId,
    public readonly supplierId: SupplierId,
    public readonly rejectedPricing: WholesalePricing,
    public readonly rejectionReason: string,
    public readonly rejectedBy: string,
    occurredAt?: Date
  ) {
    super(eventId, aggregateId, occurredAt);
  }

  get eventType(): string {
    return 'WholesalePricingRejected';
  }
}

export class WholesalePricingPublishedEvent extends PricingDomainEvent {
  constructor(
    eventId: string,
    aggregateId: ProductId,
    public readonly supplierId: SupplierId,
    public readonly publishedPricing: WholesalePricing,
    public readonly publishedBy: string,
    public readonly effectiveDate: Date,
    occurredAt?: Date
  ) {
    super(eventId, aggregateId, occurredAt);
  }

  get eventType(): string {
    return 'WholesalePricingPublished';
  }
}

export class PromotionalPricingAppliedEvent extends PricingDomainEvent {
  constructor(
    eventId: string,
    aggregateId: ProductId,
    public readonly sellerId: SellerId,
    public readonly promotionalPricing: {
      discountType: 'percentage' | 'fixed_amount';
      discountValue: number;
      originalPrice: Price;
      promotionalPrice: Price;
      campaignId: string;
      campaignName: string;
    },
    public readonly appliedBy: string,
    public readonly startDate: Date,
    public readonly endDate: Date,
    occurredAt?: Date
  ) {
    super(eventId, aggregateId, occurredAt);
  }

  get eventType(): string {
    return 'PromotionalPricingApplied';
  }
}

export class PromotionalPricingExpiredEvent extends PricingDomainEvent {
  constructor(
    eventId: string,
    aggregateId: ProductId,
    public readonly sellerId: SellerId,
    public readonly campaignId: string,
    public readonly originalPrice: Price,
    public readonly promotionalPrice: Price,
    public readonly expiredBy: 'manual' | 'automatic',
    public readonly expiredByUser?: string,
    occurredAt?: Date
  ) {
    super(eventId, aggregateId, occurredAt);
  }

  get eventType(): string {
    return 'PromotionalPricingExpired';
  }
}

export class PricingChangeNotificationSentEvent extends PricingDomainEvent {
  constructor(
    eventId: string,
    aggregateId: ProductId,
    public readonly sellerId: SellerId,
    public readonly notificationType: 'price_increase' | 'price_decrease' | 'promotion_start' | 'promotion_end',
    public readonly recipients: string[],
    public readonly notificationData: {
      oldPrice?: Price;
      newPrice: Price;
      changePercentage?: number;
      campaignName?: string;
    },
    public readonly sentBy: string,
    occurredAt?: Date
  ) {
    super(eventId, aggregateId, occurredAt);
  }

  get eventType(): string {
    return 'PricingChangeNotificationSent';
  }
}

export class DynamicPricingTriggeredEvent extends PricingDomainEvent {
  constructor(
    eventId: string,
    aggregateId: ProductId,
    public readonly sellerId: SellerId,
    public readonly triggerReason: 'demand_high' | 'demand_low' | 'competition' | 'seasonal' | 'inventory_level',
    public readonly oldPrice: Price,
    public readonly newPrice: Price,
    public readonly priceChangePercentage: number,
    public readonly triggeredBy: 'algorithm' | 'manual',
    public readonly triggerData?: Record<string, unknown>,
    occurredAt?: Date
  ) {
    super(eventId, aggregateId, occurredAt);
  }

  get eventType(): string {
    return 'DynamicPricingTriggered';
  }
}

// Union type for all pricing events
export type PricingEvent =
  | ProductPricingUpdatedEvent
  | PricingValidationRequestedEvent
  | PricingValidationPassedEvent
  | PricingValidationFailedEvent
  | WholesalePricingCalculatedEvent
  | WholesalePricingApprovedEvent
  | WholesalePricingRejectedEvent
  | WholesalePricingPublishedEvent
  | PromotionalPricingAppliedEvent
  | PromotionalPricingExpiredEvent
  | PricingChangeNotificationSentEvent
  | DynamicPricingTriggeredEvent;
