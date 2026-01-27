/**
 * Pricing Update Saga
 * Orchestrates pricing updates with validation, business rules, and notifications
 * Handles bulk pricing changes, promotional pricing, and price adjustments
 */

import {
  ProductRepository,
  DomainEventPublisher,
  IdGenerator,
  DateTimeService
} from '../../domain/interfaces';
import { ProductId, SellerId } from '../../domain/value-objects/ids.value-object';
import { BaseSaga } from './index';

export interface PricingUpdateContext {
  productIds: string[];
  pricingStrategy: 'fixed' | 'percentage' | 'formula';
  pricingValue: number;
  currency?: string;
  effectiveDate?: Date;
  expiryDate?: Date;
  sellerId?: string;
  reason: string;
  validateBusinessRules: boolean;
  notifyStakeholders: boolean;
  requestId: string;
  timestamp: Date;
}

export interface PricingUpdateResult {
  successful: string[];
  failed: Array<{ productId: string; error: string }>;
  skipped: Array<{ productId: string; reason: string }>;
  totalProcessed: number;
  totalSuccessful: number;
  totalFailed: number;
  pricingImpact: {
    totalRevenueChange: number;
    averagePriceChangePercent: number;
    productsAffected: number;
  };
}

/**
 * Pricing Update Saga
 * Handles complex pricing update workflows with validation and rollback
 */
export class PricingUpdateSaga extends BaseSaga {
  readonly sagaId: string;
  readonly sagaType = 'PricingUpdate';

  private results: PricingUpdateResult = {
    successful: [],
    failed: [],
    skipped: [],
    totalProcessed: 0,
    totalSuccessful: 0,
    totalFailed: 0,
    pricingImpact: {
      totalRevenueChange: 0,
      averagePriceChangePercent: 0,
      productsAffected: 0
    }
  };

  constructor(
    private readonly productRepository: ProductRepository,
    private readonly eventPublisher: DomainEventPublisher,
    private readonly idGenerator: IdGenerator,
    private readonly dateTimeService: DateTimeService,
    context: PricingUpdateContext
  ) {
    super();
    this.sagaId = `pricing-update-${this.idGenerator.generate()}`;

    this.initializeState(context);
    this.setupSagaSteps();
  }

  protected initializeState(context: PricingUpdateContext): void {
    this.state = {
      productIds: context.productIds,
      pricingStrategy: context.pricingStrategy,
      pricingValue: context.pricingValue,
      currency: context.currency || 'USD',
      effectiveDate: context.effectiveDate,
      expiryDate: context.expiryDate,
      sellerId: context.sellerId,
      reason: context.reason,
      validateBusinessRules: context.validateBusinessRules,
      notifyStakeholders: context.notifyStakeholders,
      requestId: context.requestId,
      timestamp: context.timestamp,

      // Saga state
      currentStep: 'initialized',
      productsValidated: false,
      pricingCalculated: false,
      businessRulesChecked: false,
      pricingApplied: false,
      notificationsSent: false,

      // Progress tracking
      processedProducts: [],
      successfulUpdates: [],
      failedUpdates: [],
      skippedProducts: [],

      // Compensation tracking
      originalPrices: new Map(), // productId -> original price
      appliedPricingChanges: new Map(), // productId -> applied changes

      // Error handling
      errors: [],
      retryCount: 0,
      maxRetries: 2,

      // Pricing analytics
      totalRevenueChange: 0,
      priceChangePercentages: []
    };
  }

  private setupSagaSteps(): void {
    // Step 1: Validate products and permissions
    this.addStep(
      'validate_products',
      async () => {
        console.log(`[${this.sagaId}] Validating ${this.state.productIds.length} products for pricing update`);

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

            // Store original price for compensation
            this.state.originalPrices.set(productId, { ...product.price });

            this.state.processedProducts.push(productId);
          } catch (error) {
            this.results.failed.push({
              productId,
              error: `Validation failed: ${error instanceof Error ? error.message : String(error)}`
            });
          }
        }

        if (this.state.processedProducts.length === 0) {
          throw new Error('No valid products to update pricing for');
        }

        this.state.productsValidated = true;
        this.markStepCompleted('validate_products');
      },
      async () => {
        console.log(`[${this.sagaId}] Compensating product validation`);
        // Clear validation state
        this.state.processedProducts = [];
        this.state.originalPrices.clear();
      }
    );

    // Step 2: Calculate new pricing
    this.addStep(
      'calculate_pricing',
      async () => {
        console.log(`[${this.sagaId}] Calculating new pricing for ${this.state.processedProducts.length} products`);

        for (const productId of this.state.processedProducts) {
          try {
            const originalPrice = this.state.originalPrices.get(productId);
            if (!originalPrice) continue;

            // Calculate new price based on strategy
            const newPrice = await this.calculateNewPrice(productId, originalPrice);

            if (newPrice) {
              this.state.appliedPricingChanges.set(productId, {
                originalPrice,
                newPrice,
                changeAmount: newPrice.amount - originalPrice.amount,
                changePercent: ((newPrice.amount - originalPrice.amount) / originalPrice.amount) * 100
              });

              this.state.successfulUpdates.push(productId);

              // Track pricing impact
              this.state.totalRevenueChange += newPrice.amount - originalPrice.amount;
              this.state.priceChangePercentages.push(
                ((newPrice.amount - originalPrice.amount) / originalPrice.amount) * 100
              );
            } else {
              this.results.failed.push({
                productId,
                error: 'Price calculation failed'
              });
              this.state.failedUpdates.push(productId);
            }
          } catch (error) {
            this.results.failed.push({
              productId,
              error: `Pricing calculation failed: ${error instanceof Error ? error.message : String(error)}`
            });
            this.state.failedUpdates.push(productId);
          }
        }

        if (this.state.successfulUpdates.length === 0) {
          throw new Error('No valid pricing calculations');
        }

        this.state.pricingCalculated = true;
        this.markStepCompleted('calculate_pricing');
      },
      async () => {
        console.log(`[${this.sagaId}] Compensating pricing calculation`);
        // Clear calculated pricing
        this.state.appliedPricingChanges.clear();
        this.state.successfulUpdates = [];
        this.state.failedUpdates = [];
        this.state.totalRevenueChange = 0;
        this.state.priceChangePercentages = [];
      }
    );

    // Step 3: Validate business rules
    this.addStep(
      'validate_business_rules',
      async () => {
        if (!this.state.validateBusinessRules) {
          console.log(`[${this.sagaId}] Skipping business rules validation`);
          this.markStepCompleted('validate_business_rules');
          return;
        }

        console.log(`[${this.sagaId}] Validating business rules for pricing changes`);

        for (const productId of this.state.successfulUpdates) {
          try {
            const pricingChange = this.state.appliedPricingChanges.get(productId);
            if (!pricingChange) continue;

            // Validate pricing business rules
            await this.validatePricingBusinessRules(productId, pricingChange);

          } catch (error) {
            this.results.failed.push({
              productId,
              error: `Business rules validation failed: ${error instanceof Error ? error.message : String(error)}`
            });

            // Move from successful to failed
            this.state.successfulUpdates = this.state.successfulUpdates.filter((id: string) => id !== productId);
            this.state.failedUpdates.push(productId);
          }
        }

        if (this.state.successfulUpdates.length === 0) {
          throw new Error('All pricing changes failed business rules validation');
        }

        this.state.businessRulesChecked = true;
        this.markStepCompleted('validate_business_rules');
      },
      async () => {
        console.log(`[${this.sagaId}] Compensating business rules validation`);
        // No compensation needed for validation
      }
    );

    // Step 4: Apply pricing updates
    this.addStep(
      'apply_pricing_updates',
      async () => {
        console.log(`[${this.sagaId}] Applying pricing updates to ${this.state.successfulUpdates.length} products`);

        for (const productId of this.state.successfulUpdates) {
          try {
            const pricingChange = this.state.appliedPricingChanges.get(productId);
            if (!pricingChange) continue;

            // Apply the pricing update
            await this.applyPricingUpdate(productId, pricingChange.newPrice);

            this.results.successful.push(productId);
            this.results.totalSuccessful++;
          } catch (error) {
            this.results.failed.push({
              productId,
              error: `Pricing update application failed: ${error instanceof Error ? error.message : String(error)}`
            });
            this.results.totalFailed++;
          }
        }

        this.results.totalProcessed = this.state.processedProducts.length;

        // Calculate pricing impact metrics
        this.results.pricingImpact = {
          totalRevenueChange: this.state.totalRevenueChange,
          averagePriceChangePercent: this.state.priceChangePercentages.length > 0
            ? this.state.priceChangePercentages.reduce((a, b) => a + b, 0) / this.state.priceChangePercentages.length
            : 0,
          productsAffected: this.results.successful.length
        };

        if (this.results.successful.length === 0) {
          throw new Error('All pricing updates failed to apply');
        }

        this.state.pricingApplied = true;
        this.markStepCompleted('apply_pricing_updates');
      },
      async () => {
        console.log(`[${this.sagaId}] Compensating pricing updates`);

        // Rollback successful pricing updates
        for (const productId of this.results.successful) {
          try {
            const originalPrice = this.state.originalPrices.get(productId);
            if (originalPrice) {
              await this.applyPricingUpdate(productId, originalPrice);
            }
          } catch (error) {
            console.error(`[${this.sagaId}] Failed to rollback pricing for product ${productId}:`, error instanceof Error ? error.message : String(error));
          }
        }

        // Clear results
        this.results.successful = [];
        this.results.totalSuccessful = 0;
        this.state.pricingApplied = false;
      }
    );

    // Step 5: Send notifications and events
    this.addStep(
      'send_notifications',
      async () => {
        console.log(`[${this.sagaId}] Sending notifications for ${this.results.successful.length} pricing updates`);

        // Send pricing update completion event
        await this.eventPublisher.publish({
          eventId: this.idGenerator.generate(),
          eventType: 'PricingUpdateCompleted',
          aggregateId: this.sagaId,
          version: 1,
          timestamp: this.dateTimeService.now(),
          payload: {
            sagaId: this.sagaId,
            pricingStrategy: this.state.pricingStrategy,
            pricingValue: this.state.pricingValue,
            totalProducts: this.results.totalProcessed,
            successfulUpdates: this.results.totalSuccessful,
            failedUpdates: this.results.totalFailed,
            productIds: this.results.successful,
            pricingImpact: this.results.pricingImpact,
            reason: this.state.reason,
            effectiveDate: this.state.effectiveDate,
            expiryDate: this.state.expiryDate,
            requestId: this.state.requestId
          }
        });

        // Send individual product pricing update events
        for (const productId of this.results.successful) {
          const pricingChange = this.state.appliedPricingChanges.get(productId);
          if (pricingChange) {
            await this.eventPublisher.publish({
              eventId: this.idGenerator.generate(),
              eventType: 'ProductPricingUpdated',
              aggregateId: productId,
              version: 1,
              timestamp: this.dateTimeService.now(),
              payload: {
                productId,
                originalPrice: pricingChange.originalPrice,
                newPrice: pricingChange.newPrice,
                changeAmount: pricingChange.changeAmount,
                changePercent: pricingChange.changePercent,
                pricingStrategy: this.state.pricingStrategy,
                reason: this.state.reason,
                bulkUpdateId: this.sagaId,
                effectiveDate: this.state.effectiveDate,
                expiryDate: this.state.expiryDate
              }
            });
          }
        }

        // Send stakeholder notifications if requested
        if (this.state.notifyStakeholders) {
          await this.sendStakeholderNotifications();
        }

        this.state.notificationsSent = true;
        this.markStepCompleted('send_notifications');
      },
      async () => {
        console.log(`[${this.sagaId}] Compensating notifications`);
        // Events are typically not compensated as they're immutable
        // In a real system, you might send "pricing update retracted" events
      }
    );
  }

  protected async executeNextStep(): Promise<void> {
    const steps = ['validate_products', 'calculate_pricing', 'validate_business_rules', 'apply_pricing_updates', 'send_notifications'];

    for (const stepId of steps) {
      if (!this.state.completedSteps?.includes(stepId)) {
        try {
          this.state.currentStep = stepId;
          const step = this.steps.find(s => s.id === stepId);

          if (step) {
            await step.operation();

            // Check if we should continue based on partial success
            if (stepId === 'apply_pricing_updates' && this.results.successful.length > 0) {
              // Continue even if some updates failed
              console.log(`[${this.sagaId}] Continuing with ${this.results.successful.length} successful pricing updates`);
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
    // Handle events that might affect the pricing update

    switch (event.eventType) {
      case 'ProductDeleted':
        // Remove deleted products from processing
        const deletedIndex = this.state.productIds.indexOf(event.payload.productId);
        if (deletedIndex !== -1) {
          this.state.productIds.splice(deletedIndex, 1);
          console.log(`[${this.sagaId}] Removed deleted product ${event.payload.productId} from pricing update`);
        }
        break;

      case 'PricingPolicyChanged':
        // Check if pricing policies affect this update
        console.log(`[${this.sagaId}] Pricing policy changed, may affect validation`);
        // Could re-validate business rules if needed
        break;
    }
  }

  // Helper methods

  private canContinueWithPartialSuccess(stepId: string): boolean {
    // For bulk operations, we can continue with partial success in some cases
    if (stepId === 'apply_pricing_updates' && this.results.successful.length > 0) {
      return true; // Continue if at least some pricing updates succeeded
    }

    if (stepId === 'send_notifications') {
      return true; // Notifications are not critical for the pricing update success
    }

    return false;
  }

  private async calculateNewPrice(productId: string, originalPrice: any): Promise<any> {
    const { pricingStrategy, pricingValue, currency } = this.state;

    switch (pricingStrategy) {
      case 'fixed':
        return {
          amount: pricingValue,
          currency: currency || originalPrice.currency
        };

      case 'percentage':
        const percentageChange = pricingValue / 100;
        return {
          amount: originalPrice.amount * (1 + percentageChange),
          currency: originalPrice.currency
        };

      case 'formula':
        // Simple formula implementation (could be enhanced with a proper pricing engine)
        // For now, treat pricingValue as a multiplier
        return {
          amount: originalPrice.amount * pricingValue,
          currency: originalPrice.currency
        };

      default:
        throw new Error(`Unsupported pricing strategy: ${pricingStrategy}`);
    }
  }

  private async validatePricingBusinessRules(productId: string, pricingChange: any): Promise<void> {
    const { changePercent, newPrice } = pricingChange;

    // Business rule validations
    if (Math.abs(changePercent) > 50) {
      throw new Error(`Price change of ${changePercent.toFixed(1)}% exceeds 50% limit`);
    }

    if (newPrice.amount <= 0) {
      throw new Error('New price must be greater than 0');
    }

    if (newPrice.amount > 100000) {
      throw new Error('New price cannot exceed $100,000');
    }

    // Could add more business rules:
    // - Competitor price analysis
    // - Margin validation
    // - Seasonal pricing rules
    // - Seller-specific constraints
  }

  private async applyPricingUpdate(productId: string, newPrice: any): Promise<void> {
    // Get current product state
    const currentProduct = await this.productRepository.findById(productId);
    if (!currentProduct) {
      throw new Error(`Product ${productId} not found during pricing update`);
    }

    // Apply pricing update
    const updatedProduct = {
      ...currentProduct,
      price: newPrice,
      updatedAt: this.dateTimeService.now()
    };

    // Save updated product
    await this.productRepository.save(updatedProduct);
  }

  private async sendStakeholderNotifications(): Promise<void> {
    // In a real implementation, this would:
    // 1. Identify stakeholders (sellers, administrators, affected users)
    // 2. Send notifications about pricing changes
    // 3. Include pricing impact summaries

    console.log(`[${this.sagaId}] Sending stakeholder notifications for pricing changes`);
    console.log(`[${this.sagaId}] Pricing impact: ${this.results.pricingImpact.productsAffected} products affected, $${this.results.pricingImpact.totalRevenueChange.toFixed(2)} revenue change`);
  }

  // Public method to get current results
  public getResults(): PricingUpdateResult {
    return { ...this.results };
  }
}
