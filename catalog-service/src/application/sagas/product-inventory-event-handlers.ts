/**
 * Product Inventory Event Handlers
 * Handle events from inventory service for saga coordination
 * Enables event-driven communication between catalog and inventory services
 */

import { BaseEventHandler } from '../handlers';
import { ProductRepository, DomainEventPublisher, IdGenerator, DateTimeService } from '../../domain/interfaces';

export interface InventoryVerifiedEvent {
  eventId: string;
  eventType: 'ProductInventoryVerified';
  aggregateId: string; // productId
  version: number;
  timestamp: Date;
  payload: {
    productId: string;
    sagaId: string;
    verified: boolean;
    availableStock: number;
    reservedStock: number;
    status: 'in_stock' | 'low_stock' | 'out_of_stock';
    verificationTimestamp: Date;
  };
}

export interface InventoryVerificationFailedEvent {
  eventId: string;
  eventType: 'ProductInventoryVerificationFailed';
  aggregateId: string;
  version: number;
  timestamp: Date;
  payload: {
    productId: string;
    sagaId: string;
    reason: string;
    errorCode: string;
    verificationTimestamp: Date;
  };
}

export interface InventoryUpdatedEvent {
  eventId: string;
  eventType: 'ProductInventoryUpdated';
  aggregateId: string;
  version: number;
  timestamp: Date;
  payload: {
    productId: string;
    previousStock: {
      available: number;
      reserved: number;
      total: number;
    };
    newStock: {
      available: number;
      reserved: number;
      total: number;
    };
    changeReason: string;
    updatedBy: string;
    updateTimestamp: Date;
  };
}

/**
 * Product Inventory Verified Handler
 * Handles successful inventory verification responses
 */
export class ProductInventoryVerifiedHandler extends BaseEventHandler {
  readonly eventType = 'ProductInventoryVerified';

  constructor(
    private readonly productRepository: ProductRepository,
    private readonly eventPublisher: DomainEventPublisher,
    private readonly idGenerator: IdGenerator,
    private readonly dateTimeService: DateTimeService
  ) {
    super();
  }

  async handle(event: InventoryVerifiedEvent, context?: any): Promise<void> {
    this.validateEvent(event);

    const { productId, sagaId, verified, availableStock, reservedStock, status } = event.payload;

    console.log(`[${this.constructor.name}] Processing inventory verification for product ${productId}, saga ${sagaId}`);

    try {
      // Update product with inventory status if needed
      if (verified) {
        // Could update product metadata with inventory status
        // For now, just log the verification
        console.log(`Product ${productId} inventory verified: ${status} (${availableStock} available, ${reservedStock} reserved)`);
      }

      // Publish saga continuation event
      await this.eventPublisher.publish({
        eventId: this.idGenerator.generate(),
        eventType: 'SagaStepCompleted',
        aggregateId: sagaId,
        version: 1,
        timestamp: this.dateTimeService.now(),
        payload: {
          sagaId,
          stepId: 'wait_inventory_verification',
          stepResult: 'completed',
          productId,
          inventoryStatus: status,
          availableStock,
          reservedStock
        }
      });

    } catch (error) {
      console.error(`[${this.constructor.name}] Failed to process inventory verification:`, error instanceof Error ? error.message : String(error));

      // Publish saga failure event
      await this.eventPublisher.publish({
        eventId: this.idGenerator.generate(),
        eventType: 'SagaStepFailed',
        aggregateId: sagaId,
        version: 1,
        timestamp: this.dateTimeService.now(),
        payload: {
          sagaId,
          stepId: 'wait_inventory_verification',
          error: error instanceof Error ? error.message : String(error),
          productId
        }
      });
    }
  }
}

/**
 * Product Inventory Verification Failed Handler
 * Handles failed inventory verification responses
 */
export class ProductInventoryVerificationFailedHandler extends BaseEventHandler {
  readonly eventType = 'ProductInventoryVerificationFailed';

  constructor(
    private readonly eventPublisher: DomainEventPublisher,
    private readonly idGenerator: IdGenerator,
    private readonly dateTimeService: DateTimeService
  ) {
    super();
  }

  async handle(event: InventoryVerificationFailedEvent, context?: any): Promise<void> {
    this.validateEvent(event);

    const { productId, sagaId, reason, errorCode } = event.payload;

    console.log(`[${this.constructor.name}] Processing inventory verification failure for product ${productId}, saga ${sagaId}: ${reason}`);

    // Publish saga failure event
    await this.eventPublisher.publish({
      eventId: this.idGenerator.generate(),
      eventType: 'SagaStepFailed',
      aggregateId: sagaId,
      version: 1,
      timestamp: this.dateTimeService.now(),
      payload: {
        sagaId,
        stepId: 'wait_inventory_verification',
        error: `Inventory verification failed: ${reason}`,
        errorCode,
        productId
      }
    });
  }
}

/**
 * Product Inventory Updated Handler
 * Handles inventory updates from inventory service
 * Can trigger product status updates or notifications
 */
export class ProductInventoryUpdatedHandler extends BaseEventHandler {
  readonly eventType = 'ProductInventoryUpdated';

  constructor(
    private readonly productRepository: ProductRepository,
    private readonly eventPublisher: DomainEventPublisher,
    private readonly idGenerator: IdGenerator,
    private readonly dateTimeService: DateTimeService
  ) {
    super();
  }

  async handle(event: InventoryUpdatedEvent, context?: any): Promise<void> {
    this.validateEvent(event);

    const { productId, previousStock, newStock, changeReason, updatedBy } = event.payload;

    console.log(`[${this.constructor.name}] Processing inventory update for product ${productId}: ${previousStock.total} -> ${newStock.total}`);

    try {
      // Check if product status needs to be updated based on inventory
      const product = await this.productRepository.findById(productId);
      if (!product) {
        console.warn(`Product ${productId} not found for inventory update`);
        return;
      }

      // Determine inventory status
      let inventoryStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
      if (newStock.available === 0) {
        inventoryStatus = 'out_of_stock';
      } else if (newStock.available < 5) { // Low stock threshold
        inventoryStatus = 'low_stock';
      } else {
        inventoryStatus = 'in_stock';
      }

      // Publish product inventory status changed event
      await this.eventPublisher.publish({
        eventId: this.idGenerator.generate(),
        eventType: 'ProductInventoryStatusChanged',
        aggregateId: productId,
        version: 1,
        timestamp: this.dateTimeService.now(),
        payload: {
          productId,
          previousStatus: this.getInventoryStatus(previousStock.available),
          newStatus: inventoryStatus,
          availableStock: newStock.available,
          reservedStock: newStock.reserved,
          totalStock: newStock.total,
          changeReason,
          updatedBy,
          changeTimestamp: event.payload.updateTimestamp
        }
      });

      // If product went out of stock, might want to update product status or send notifications
      if (inventoryStatus === 'out_of_stock' && previousStock.available > 0) {
        console.log(`Product ${productId} went out of stock`);

        // Could publish additional events for out-of-stock handling
        await this.eventPublisher.publish({
          eventId: this.idGenerator.generate(),
          eventType: 'ProductOutOfStock',
          aggregateId: productId,
          version: 1,
          timestamp: this.dateTimeService.now(),
          payload: {
            productId,
            previousStock: previousStock.available,
            outOfStockTimestamp: this.dateTimeService.now()
          }
        });
      }

    } catch (error) {
      console.error(`[${this.constructor.name}] Failed to process inventory update:`, error instanceof Error ? error.message : String(error));
    }
  }

  private getInventoryStatus(availableStock: number): 'in_stock' | 'low_stock' | 'out_of_stock' {
    if (availableStock === 0) return 'out_of_stock';
    if (availableStock < 5) return 'low_stock';
    return 'in_stock';
  }
}

/**
 * Product Created Inventory Handler
 * Handles ProductCreated events to initialize inventory
 * This would typically be handled by the inventory service, but included here for completeness
 */
export class ProductCreatedInventoryHandler extends BaseEventHandler {
  readonly eventType = 'ProductCreated';

  constructor(
    private readonly eventPublisher: DomainEventPublisher,
    private readonly idGenerator: IdGenerator,
    private readonly dateTimeService: DateTimeService
  ) {
    super();
  }

  async handle(event: any, context?: any): Promise<void> {
    this.validateEvent(event);

    const { productId, initialInventoryCount } = event.payload;

    console.log(`[${this.constructor.name}] Processing product creation for inventory initialization: ${productId}`);

    if (initialInventoryCount && initialInventoryCount > 0) {
      // Publish inventory initialization request
      await this.eventPublisher.publish({
        eventId: this.idGenerator.generate(),
        eventType: 'ProductInventoryInitializationRequested',
        aggregateId: productId,
        version: 1,
        timestamp: this.dateTimeService.now(),
        payload: {
          productId,
          initialQuantity: initialInventoryCount,
          reason: 'Product creation',
          requestedBy: event.payload.sellerId || 'system',
          requestTimestamp: this.dateTimeService.now()
        }
      });
    }
  }
}

// Export handler instances for registration
export const productInventoryVerifiedHandler = (dependencies: {
  productRepository: ProductRepository;
  eventPublisher: DomainEventPublisher;
  idGenerator: IdGenerator;
  dateTimeService: DateTimeService;
}) => new ProductInventoryVerifiedHandler(
  dependencies.productRepository,
  dependencies.eventPublisher,
  dependencies.idGenerator,
  dependencies.dateTimeService
);

export const productInventoryVerificationFailedHandler = (dependencies: {
  eventPublisher: DomainEventPublisher;
  idGenerator: IdGenerator;
  dateTimeService: DateTimeService;
}) => new ProductInventoryVerificationFailedHandler(
  dependencies.eventPublisher,
  dependencies.idGenerator,
  dependencies.dateTimeService
);

export const productInventoryUpdatedHandler = (dependencies: {
  productRepository: ProductRepository;
  eventPublisher: DomainEventPublisher;
  idGenerator: IdGenerator;
  dateTimeService: DateTimeService;
}) => new ProductInventoryUpdatedHandler(
  dependencies.productRepository,
  dependencies.eventPublisher,
  dependencies.idGenerator,
  dependencies.dateTimeService
);

export const productCreatedInventoryHandler = (dependencies: {
  eventPublisher: DomainEventPublisher;
  idGenerator: IdGenerator;
  dateTimeService: DateTimeService;
}) => new ProductCreatedInventoryHandler(
  dependencies.eventPublisher,
  dependencies.idGenerator,
  dependencies.dateTimeService
);
