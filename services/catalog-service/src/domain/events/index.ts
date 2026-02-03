/**
 * Domain Events Index
 * Central export point for all domain events in the Catalog Service
 */

// Product Events
export * from './product-events';

// Pricing Events
export * from './pricing-events';

// Category Events
export * from './category-events';

// Media Events
export * from './media-events';

// Import types for union type definition
import type { ProductEvent } from './product-events';
import type { PricingEvent } from './pricing-events';
import type { CategoryEvent } from './category-events';
import type { MediaEvent } from './media-events';

// Union type for all catalog domain events
export type CatalogDomainEvent =
  | ProductEvent
  | PricingEvent
  | CategoryEvent
  | MediaEvent;

// Event type registry for runtime type checking
export const EVENT_TYPES = {
  // Product Events
  ProductCreated: 'ProductCreated',
  ProductUpdated: 'ProductUpdated',
  ProductStatusChanged: 'ProductStatusChanged',
  ProductPublished: 'ProductPublished',
  ProductArchived: 'ProductArchived',
  ProductImageAdded: 'ProductImageAdded',
  ProductVariantAdded: 'ProductVariantAdded',
  ProductVariantUpdated: 'ProductVariantUpdated',
  ProductSEOUpdated: 'ProductSEOUpdated',
  ProductInventoryUpdated: 'ProductInventoryUpdated',
  ProductViewed: 'ProductViewed',

  // Pricing Events
  ProductPricingUpdated: 'ProductPricingUpdated',
  PricingValidationRequested: 'PricingValidationRequested',
  PricingValidationPassed: 'PricingValidationPassed',
  PricingValidationFailed: 'PricingValidationFailed',
  WholesalePricingCalculated: 'WholesalePricingCalculated',
  WholesalePricingApproved: 'WholesalePricingApproved',
  WholesalePricingRejected: 'WholesalePricingRejected',
  WholesalePricingPublished: 'WholesalePricingPublished',
  PromotionalPricingApplied: 'PromotionalPricingApplied',
  PromotionalPricingExpired: 'PromotionalPricingExpired',
  PricingChangeNotificationSent: 'PricingChangeNotificationSent',
  DynamicPricingTriggered: 'DynamicPricingTriggered',

  // Category Events
  CategoryCreated: 'CategoryCreated',
  CategoryUpdated: 'CategoryUpdated',
  CategoryDeleted: 'CategoryDeleted',
  CategoryActivated: 'CategoryActivated',
  CategoryDeactivated: 'CategoryDeactivated',
  CategoryProductAdded: 'CategoryProductAdded',
  CategoryProductRemoved: 'CategoryProductRemoved',
  CategoryDisplayOrderChanged: 'CategoryDisplayOrderChanged',
  CategoryHierarchyChanged: 'CategoryHierarchyChanged',

  // Media Events
  MediaUploaded: 'MediaUploaded',
  MediaProcessed: 'MediaProcessed',
  MediaProcessingFailed: 'MediaProcessingFailed',
  MediaDeleted: 'MediaDeleted',
  MediaUpdated: 'MediaUpdated',
  MediaTagged: 'MediaTagged',
  MediaOptimized: 'MediaOptimized',
  MediaCdnDeployed: 'MediaCdnDeployed',
  MediaViewed: 'MediaViewed'
} as const;

export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES];
