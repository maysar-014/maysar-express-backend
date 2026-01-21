/**
 * Bulk Product Update Saga
 * Orchestrates bulk updates to multiple products
 * Ensures atomicity across multiple product updates with rollback capability
 */

import {
  ProductRepository,
  CategoryRepository,
  DomainEventPublisher,
  IdGenerator,
  DateTimeService
} from '../../domain/interfaces';
import { BaseSaga } from './index';

export interface BulkProductUpdateContext {
  productIds: string[];
  updates: Record<string, any>;
  updateType: 'price' | 'status' | 'category' | 'attributes' | 'visibility';
  sellerId?: string;
  validateBusinessRules: boolean;
  requestId: string;
  timestamp: Date;
}

export interface BulkUpdateResult {
  successful: string[];
  failed: Array<{ productId: string; error: string }>;
  skipped: Array<{ productId: string; reason: string }>;
  totalProcessed: number;
  totalSuccessful: number;
  totalFailed: number;
}

export class BulkProductUpdateSaga extends BaseSaga {
  readonly sagaId: string;
  readonly sagaType = 'BulkProductUpdate';

  private results: BulkUpdateResult = {
    successful: [],
    failed: [],
    skipped: [],
    totalProcessed: 0,
    totalSuccessful: 0,
    totalFailed: 0
  };

  constructor(
    private readonly productRepository: ProductRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly eventPublisher: DomainEventPublisher,
    private readonly idGenerator: IdGenerator,
    private readonly dateTimeService: DateTimeService,
    context: BulkProductUpdateContext
  ) {
    super();
    this.sagaId = `bulk-update-${this.idGenerator.generate()}`;

    this.initializeState(context);
    this.setupSagaSteps();
  }

  protected initializeState(context: BulkProductUpdateContext): void {
    this.state = {
      productIds: context.productIds,
      updates: context.updates,
      updateType: context.updateType,
      sellerId: context.sellerId,
      validateBusinessRules: context.validateBusinessRules,
      requestId: context.requestId,
      timestamp: context.timestamp,

      // Saga state
      currentStep: 'initialized',
      productsValidated: false,
      updatesPrepared: false,
      updatesApplied: false,
      notificationsSent: false,

      // Progress tracking
      processedProducts: [],
      successfulUpdates: [],
      failedUpdates: [],
      skippedProducts: [],

      // Compensation tracking
      originalStates: new Map(), // productId -> original state
      appliedUpdates: new Map(), // productId -> applied changes

      // Error handling
      errors: [],
      retryCount: 0,
      maxRetries: 2
    };
  }

  private setupSagaSteps(): void {
    // Step 1: Validate products and permissions
    this.addStep(
      'validate_products',
      async () => {
        console.log(`[${this.sagaId}] Validating ${this.state.productIds.length} products`);

        for (const productId of this.state.productIds) {
          try {
            const product = await this.productRepository.findById(productId);
            if (!product) {
              this.results.skipped.push({ productId, reason: 'Product not found' });
              continue;
            }

            // Validate seller permission if specified
            if (this.state.sellerId && product.sellerId !== this.state.sellerId) {
              this.results.skipped.push({ productId, reason: 'Access denied' });
              continue;
            }

            // Store original state for compensation
            this.state.originalStates.set(productId, { ...product });

            this.state.processedProducts.push(productId);
          } catch (error) {
            this.results.failed.push({
              productId,
              error: `Validation failed: ${error instanceof Error ? error.message : String(error)}`
            });
          }
        }

        if (this.state.processedProducts.length === 0) {
          throw new Error('No valid products to update');
        }

        this.state.productsValidated = true;
        this.markStepCompleted('validate_products');
      },
      async () => {
        console.log(`[${this.sagaId}] Compensating product validation`);
        // Clear validation state
        this.state.processedProducts = [];
        this.state.originalStates.clear();
      }
    );

    // Step 2: Prepare and validate updates
    this.addStep(
      'prepare_updates',
      async () => {
        console.log(`[${this.sagaId}] Preparing updates for ${this.state.processedProducts.length} products`);

        for (const productId of this.state.processedProducts) {
          try {
            const originalProduct = this.state.originalStates.get(productId);
            const preparedUpdate = await this.prepareUpdate(productId, originalProduct);

            if (preparedUpdate.valid) {
              this.state.appliedUpdates.set(productId, preparedUpdate.update);
              this.state.successfulUpdates.push(productId);
            } else {
              this.results.failed.push({
                productId,
                error: preparedUpdate.reason || 'Update preparation failed'
              });
              this.state.failedUpdates.push(productId);
            }
          } catch (error) {
            this.results.failed.push({
              productId,
              error: `Update preparation failed: ${error instanceof Error ? error.message : String(error)}`
            });
            this.state.failedUpdates.push(productId);
          }
        }

        if (this.state.successfulUpdates.length === 0) {
          throw new Error('No valid updates to apply');
        }

        this.state.updatesPrepared = true;
        this.markStepCompleted('prepare_updates');
      },
      async () => {
        console.log(`[${this.sagaId}] Compensating update preparation`);
        // Clear prepared updates
        this.state.appliedUpdates.clear();
        this.state.successfulUpdates = [];
        this.state.failedUpdates = [];
      }
    );

    // Step 3: Apply updates to products
    this.addStep(
      'apply_updates',
      async () => {
        console.log(`[${this.sagaId}] Applying updates to ${this.state.successfulUpdates.length} products`);

        for (const productId of this.state.successfulUpdates) {
          try {
            const update = this.state.appliedUpdates.get(productId);
            if (!update) continue;

            // Apply the update based on type
            await this.applyProductUpdate(productId, update);

            this.results.successful.push(productId);
            this.results.totalSuccessful++;
          } catch (error) {
            this.results.failed.push({
              productId,
              error: `Update application failed: ${error instanceof Error ? error.message : String(error)}`
            });
            this.results.totalFailed++;
          }
        }

        this.results.totalProcessed = this.state.processedProducts.length;

        if (this.results.successful.length === 0) {
          throw new Error('All updates failed to apply');
        }

        this.state.updatesApplied = true;
        this.markStepCompleted('apply_updates');
      },
      async () => {
        console.log(`[${this.sagaId}] Compensating applied updates`);

        // Rollback successful updates
        for (const productId of this.results.successful) {
          try {
            const originalState = this.state.originalStates.get(productId);
            if (originalState) {
              await this.productRepository.save(originalState);
            }
          } catch (error) {
            console.error(`[${this.sagaId}] Failed to rollback product ${productId}:`, error instanceof Error ? error.message : String(error));
          }
        }

        // Clear results
        this.results.successful = [];
        this.results.totalSuccessful = 0;
        this.state.updatesApplied = false;
      }
    );

    // Step 4: Send notifications and events
    this.addStep(
      'send_notifications',
      async () => {
        console.log(`[${this.sagaId}] Sending notifications for ${this.results.successful.length} updated products`);

        // Send bulk update completion event
        await this.eventPublisher.publish({
          eventId: this.idGenerator.generate(),
          eventType: 'BulkProductUpdateCompleted',
          aggregateId: this.sagaId,
          version: 1,
          timestamp: this.dateTimeService.now(),
          payload: {
            sagaId: this.sagaId,
            updateType: this.state.updateType,
            totalProducts: this.results.totalProcessed,
            successfulUpdates: this.results.totalSuccessful,
            failedUpdates: this.results.totalFailed,
            productIds: this.results.successful,
            updates: this.state.updates,
            requestId: this.state.requestId
          }
        });

        // Send individual product update events
        for (const productId of this.results.successful) {
          const update = this.state.appliedUpdates.get(productId);
          if (update) {
            await this.eventPublisher.publish({
              eventId: this.idGenerator.generate(),
              eventType: 'ProductUpdated',
              aggregateId: productId,
              version: 1,
              timestamp: this.dateTimeService.now(),
              payload: {
                productId,
                changes: update,
                bulkUpdateId: this.sagaId,
                updateType: this.state.updateType
              }
            });
          }
        }

        this.state.notificationsSent = true;
        this.markStepCompleted('send_notifications');
      },
      async () => {
        console.log(`[${this.sagaId}] Compensating notifications`);
        // Events are typically not compensated as they're immutable
        // In a real system, you might send "update retracted" events
      }
    );
  }

  protected async executeNextStep(): Promise<void> {
    const steps = ['validate_products', 'prepare_updates', 'apply_updates', 'send_notifications'];

    for (const stepId of steps) {
      if (!this.state.completedSteps?.includes(stepId)) {
        try {
          this.state.currentStep = stepId;
          const step = this.steps.find(s => s.id === stepId);

          if (step) {
            await step.operation();

            // Check if we should continue based on partial success
            if (stepId === 'apply_updates' && this.results.successful.length > 0) {
              // Continue even if some updates failed
              console.log(`[${this.sagaId}] Continuing with ${this.results.successful.length} successful updates`);
            }
          }
        } catch (error) {
          console.error(`[${this.sagaId}] Step ${stepId} failed:`, error);

          // Record error
          this.state.errors.push({
            step: stepId,
            error: error instanceof Error ? error.message : String(error),
            timestamp: this.dateTimeService.now()
          });

          // For bulk operations, we might want to continue with partial success
          // instead of full compensation
          if (this.canContinueWithPartialSuccess(stepId)) {
            console.log(`[${this.sagaId}] Continuing with partial success after ${stepId} failure`);
            continue;
          }

          // Check if we should retry
          if (this.state.retryCount < this.state.maxRetries) {
            this.state.retryCount++;
            console.log(`[${this.sagaId}] Retrying step ${stepId} (attempt ${this.state.retryCount})`);
            continue;
          }

          // Max retries reached or cannot continue, compensate and fail
          await this.compensate();
          throw error;
        }
      }
    }
  }

  protected async processEvent(event: any): Promise<void> {
    // Handle events that might affect the bulk update

    switch (event.eventType) {
      case 'ProductDeleted':
        // Remove deleted products from processing
        const deletedIndex = this.state.productIds.indexOf(event.payload.productId);
        if (deletedIndex !== -1) {
          this.state.productIds.splice(deletedIndex, 1);
          console.log(`[${this.sagaId}] Removed deleted product ${event.payload.productId} from bulk update`);
        }
        break;

      case 'CategoryDeactivated':
        // Check if any products are in the deactivated category
        if (this.state.updateType === 'category' && this.state.updates.categoryId === event.payload.categoryId) {
          console.log(`[${this.sagaId}] Category ${event.payload.categoryId} was deactivated, compensating`);
          await this.compensate();
        }
        break;
    }
  }

  // Helper methods

  private canContinueWithPartialSuccess(stepId: string): boolean {
    // For bulk updates, we can continue with partial success in some cases
    if (stepId === 'apply_updates' && this.results.successful.length > 0) {
      return true; // Continue if at least some updates succeeded
    }

    if (stepId === 'send_notifications') {
      return true; // Notifications are not critical for the update success
    }

    return false;
  }

  private async prepareUpdate(productId: string, originalProduct: any): Promise<{
    valid: boolean;
    update?: any;
    reason?: string;
  }> {
    try {
      const update = { ...this.state.updates };

      // Validate update based on type
      switch (this.state.updateType) {
        case 'price':
          const validation = await this.validatePriceUpdate(update, originalProduct);
          if (!validation.valid) {
            return { valid: false, reason: validation.reason };
          }
          break;

        case 'status':
          const statusValidation = await this.validateStatusUpdate(update, originalProduct);
          if (!statusValidation.valid) {
            return { valid: false, reason: statusValidation.reason };
          }
          break;

        case 'category':
          const categoryValidation = await this.validateCategoryUpdate(update, originalProduct);
          if (!categoryValidation.valid) {
            return { valid: false, reason: categoryValidation.reason };
          }
          break;

        case 'attributes':
          // Basic attribute validation
          break;

        case 'visibility':
          // Basic visibility validation
          break;
      }

      // Add metadata
      update.updatedAt = this.dateTimeService.now();
      update.bulkUpdateId = this.sagaId;

      return { valid: true, update };
    } catch (error) {
      return {
        valid: false,
        reason: `Update preparation failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  private async validatePriceUpdate(update: any, originalProduct: any): Promise<{ valid: boolean; reason?: string }> {
    if (!update.price || update.price.amount <= 0) {
      return { valid: false, reason: 'Invalid price specified' };
    }

    // Check for unreasonable price changes (more than 50% change)
    const originalPrice = originalProduct.price?.amount || 0;
    const newPrice = update.price.amount;
    const changePercent = Math.abs((newPrice - originalPrice) / originalPrice) * 100;

    if (changePercent > 50 && this.state.validateBusinessRules) {
      return { valid: false, reason: `Price change of ${changePercent.toFixed(1)}% exceeds 50% limit` };
    }

    return { valid: true };
  }

  private async validateStatusUpdate(update: any, originalProduct: any): Promise<{ valid: boolean; reason?: string }> {
    const validStatuses = ['draft', 'published', 'archived', 'suspended'];
    if (!validStatuses.includes(update.status)) {
      return { valid: false, reason: `Invalid status: ${update.status}` };
    }

    // Business rules for status changes
    if (originalProduct.status === 'archived' && update.status !== 'archived') {
      return { valid: false, reason: 'Cannot change status of archived products' };
    }

    return { valid: true };
  }

  private async validateCategoryUpdate(update: any, originalProduct: any): Promise<{ valid: boolean; reason?: string }> {
    if (!update.categoryId) {
      return { valid: false, reason: 'Category ID is required' };
    }

    // Verify category exists and is active
    const category = await this.categoryRepository.findById(update.categoryId);
    if (!category) {
      return { valid: false, reason: 'Category not found' };
    }

    if (category.status !== 'active') {
      return { valid: false, reason: 'Category is not active' };
    }

    return { valid: true };
  }

  private async applyProductUpdate(productId: string, update: any): Promise<void> {
    // Get current product state
    const currentProduct = await this.productRepository.findById(productId);
    if (!currentProduct) {
      throw new Error(`Product ${productId} not found during update`);
    }

    // Apply update
    const updatedProduct = { ...currentProduct, ...update };

    // Save updated product
    await this.productRepository.save(updatedProduct);
  }

  // Public method to get current results
  public getResults(): BulkUpdateResult {
    return { ...this.results };
  }
}
