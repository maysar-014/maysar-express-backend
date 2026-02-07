/**
 * @deprecated This saga has been moved to the standalone campaign-service.
 * Use CampaignLifecycleSaga, CampaignPricingSaga, and CampaignSchedulingSaga in the new service.
 */

import {
  ProductRepository,
  CategoryRepository,
  DomainEventPublisher,
  IdGenerator,
  DateTimeService
} from '../../domain/interfaces';
import { BaseSaga } from './index';

export interface CampaignContext {
  campaignId: string;
  campaignName: string;
  campaignType: 'discount' | 'promotion' | 'clearance' | 'seasonal';
  targetProducts: string[];
  targetCategories?: string[];
  pricingRules: CampaignPricingRule[];
  schedule: {
    startDate: Date;
    endDate: Date;
    timezone: string;
  };
  conditions: CampaignCondition[];
  sellerId?: string;
  autoApply: boolean;
  autoRevert: boolean;
  requestId: string;
  timestamp: Date;
}

export interface CampaignPricingRule {
  ruleId: string;
  ruleType: 'fixed_discount' | 'percentage_discount' | 'fixed_price' | 'buy_get';
  value: number;
  conditions?: RuleCondition[];
  priority: number;
}

export interface RuleCondition {
  type: 'min_quantity' | 'max_quantity' | 'customer_segment' | 'first_time' | 'loyalty_tier';
  operator: 'equals' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
}

export interface CampaignCondition {
  type: 'min_order_value' | 'max_uses_per_customer' | 'customer_segment' | 'geographic_region';
  operator: 'equals' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
}

export interface CampaignResult {
  campaignId: string;
  status: 'active' | 'scheduled' | 'expired' | 'cancelled';
  appliedProducts: string[];
  pricingChanges: Array<{
    productId: string;
    originalPrice: number;
    campaignPrice: number;
    discountAmount: number;
    discountPercent: number;
  }>;
  metrics: {
    totalProductsAffected: number;
    totalRevenueImpact: number;
    averageDiscountPercent: number;
    campaignReach: number;
  };
  errors: Array<{ productId?: string; error: string }>;
  createdAt: Date;
  startedAt?: Date;
  endedAt?: Date;
}

/**
 * Campaign Management Saga
 * Handles complex promotional campaigns with scheduling, rules, and lifecycle management
 */
export class CampaignManagementSaga extends BaseSaga {
  readonly sagaId: string;
  readonly sagaType = 'CampaignManagement';

  private results: CampaignResult = {
    campaignId: '',
    status: 'scheduled',
    appliedProducts: [],
    pricingChanges: [],
    metrics: {
      totalProductsAffected: 0,
      totalRevenueImpact: 0,
      averageDiscountPercent: 0,
      campaignReach: 0
    },
    errors: [],
    createdAt: new Date()
  };

  constructor(
    private readonly productRepository: ProductRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly eventPublisher: DomainEventPublisher,
    private readonly idGenerator: IdGenerator,
    private readonly dateTimeService: DateTimeService,
    context: CampaignContext
  ) {
    super();
    this.sagaId = `campaign - ${context.campaignId} `;

    this.initializeState(context);
    this.setupSagaSteps();
  }

  protected initializeState(context: CampaignContext): void {
    this.state = {
      campaignId: context.campaignId,
      campaignName: context.campaignName,
      campaignType: context.campaignType,
      targetProducts: context.targetProducts,
      targetCategories: context.targetCategories || [],
      pricingRules: context.pricingRules,
      schedule: context.schedule,
      conditions: context.conditions,
      sellerId: context.sellerId,
      autoApply: context.autoApply,
      autoRevert: context.autoRevert,
      requestId: context.requestId,
      timestamp: context.timestamp,

      // Saga state
      currentStep: 'initialized',
      productsIdentified: false,
      pricingRulesValidated: false,
      campaignScheduled: false,
      campaignApplied: false,
      monitoringActive: false,

      // Progress tracking
      identifiedProducts: [],
      validatedRules: [],
      scheduledCampaigns: [],
      appliedPricing: new Map(),

      // Compensation tracking
      originalPrices: new Map(), // productId -> original price
      appliedCampaigns: new Map(), // productId -> campaign pricing

      // Monitoring
      campaignMetrics: {
        views: 0,
        conversions: 0,
        revenue: 0
      },

      // Error handling
      errors: [],
      retryCount: 0,
      maxRetries: 3
    };

    this.results.campaignId = context.campaignId;
    this.results.createdAt = context.timestamp;
  }

  private setupSagaSteps(): void {
    // Step 1: Identify target products
    this.addStep(
      'identify_products',
      async () => {
        console.log(`[${this.sagaId}] Identifying products for campaign ${this.state.campaignId}`);

        const allProductIds = new Set(this.state.targetProducts);

        // Add products from target categories
        for (const categoryId of this.state.targetCategories) {
          try {
            const categoryProducts = await this.getProductsInCategory(categoryId);
            categoryProducts.forEach(productId => allProductIds.add(productId));
          } catch (error) {
            console.warn(`Failed to get products for category ${categoryId}: `, error);
          }
        }

        this.state.identifiedProducts = Array.from(allProductIds);

        if (this.state.identifiedProducts.length === 0) {
          throw new Error('No products identified for campaign');
        }

        console.log(`[${this.sagaId}] Identified ${this.state.identifiedProducts.length} products for campaign`);
        this.state.productsIdentified = true;
        this.markStepCompleted('identify_products');
      },
      async () => {
        console.log(`[${this.sagaId}] Compensating product identification`);
        this.state.identifiedProducts = [];
      }
    );

    // Step 2: Validate pricing rules
    this.addStep(
      'validate_pricing_rules',
      async () => {
        console.log(`[${this.sagaId}] Validating pricing rules for campaign ${this.state.campaignId}`);

        for (const rule of this.state.pricingRules) {
          try {
            await this.validatePricingRule(rule);
            this.state.validatedRules.push(rule.ruleId);
          } catch (error) {
            this.results.errors.push({
              error: `Rule validation failed for ${rule.ruleId}: ${error instanceof Error ? error.message : String(error)} `
            });
          }
        }

        if (this.state.validatedRules.length === 0) {
          throw new Error('No valid pricing rules found');
        }

        console.log(`[${this.sagaId}] Validated ${this.state.validatedRules.length} pricing rules`);
        this.state.pricingRulesValidated = true;
        this.markStepCompleted('validate_pricing_rules');
      },
      async () => {
        console.log(`[${this.sagaId}] Compensating pricing rules validation`);
        this.state.validatedRules = [];
      }
    );

    // Step 3: Schedule campaign
    this.addStep(
      'schedule_campaign',
      async () => {
        console.log(`[${this.sagaId}] Scheduling campaign ${this.state.campaignId} `);

        const now = this.dateTimeService.now();

        if (this.state.schedule.startDate > now) {
          // Schedule for future start
          await this.scheduleCampaignStart();
        } else if (this.state.schedule.endDate > now) {
          // Start immediately if within active period
          await this.startCampaignImmediately();
        } else {
          throw new Error('Campaign end date is in the past');
        }

        this.state.campaignScheduled = true;
        this.markStepCompleted('schedule_campaign');
      },
      async () => {
        console.log(`[${this.sagaId}] Compensating campaign scheduling`);
        // Cancel any scheduled tasks
        await this.cancelScheduledCampaign();
        this.state.campaignScheduled = false;
      }
    );

    // Step 4: Apply campaign pricing
    this.addStep(
      'apply_campaign_pricing',
      async () => {
        if (!this.state.autoApply) {
          console.log(`[${this.sagaId}] Skipping automatic pricing application for campaign ${this.state.campaignId}`);
          this.markStepCompleted('apply_campaign_pricing');
          return;
        }

        console.log(`[${this.sagaId}] Applying campaign pricing for ${this.state.identifiedProducts.length} products`);

        for (const productId of this.state.identifiedProducts) {
          try {
            const campaignPrice = await this.calculateCampaignPrice(productId);
            if (campaignPrice) {
              await this.applyCampaignPrice(productId, campaignPrice);
              this.state.appliedPricing.set(productId, campaignPrice);
              this.results.appliedProducts.push(productId);
            }
          } catch (error) {
            this.results.errors.push({
              productId,
              error: `Failed to apply campaign pricing: ${error instanceof Error ? error.message : String(error)} `
            });
          }
        }

        // Calculate campaign metrics
        this.calculateCampaignMetrics();

        console.log(`[${this.sagaId}] Applied campaign pricing to ${this.results.appliedProducts.length} products`);
        this.state.campaignApplied = true;
        this.results.startedAt = this.dateTimeService.now();
        this.markStepCompleted('apply_campaign_pricing');
      },
      async () => {
        console.log(`[${this.sagaId}] Compensating campaign pricing application`);

        // Revert applied pricing
        for (const [productId, originalPrice] of this.state.originalPrices) {
          try {
            await this.applyCampaignPrice(productId, originalPrice);
          } catch (error) {
            console.error(`[${this.sagaId}] Failed to revert pricing for product ${productId}: `, error instanceof Error ? error.message : String(error));
          }
        }

        this.state.appliedPricing.clear();
        this.results.appliedProducts = [];
        this.results.pricingChanges = [];
        this.state.campaignApplied = false;
      }
    );

    // Step 5: Start campaign monitoring
    this.addStep(
      'start_monitoring',
      async () => {
        console.log(`[${this.sagaId}] Starting campaign monitoring for ${this.state.campaignId}`);

        // Schedule campaign end monitoring
        await this.scheduleCampaignEnd();

        // Publish campaign started event
        await this.eventPublisher.publish({
          eventId: this.idGenerator.generate(),
          eventType: 'CampaignStarted',
          aggregateId: this.state.campaignId,
          version: 1,
          timestamp: this.dateTimeService.now(),
          payload: {
            campaignId: this.state.campaignId,
            campaignName: this.state.campaignName,
            campaignType: this.state.campaignType,
            appliedProducts: this.results.appliedProducts.length,
            startDate: this.state.schedule.startDate,
            endDate: this.state.schedule.endDate,
            requestId: this.state.requestId
          }
        });

        this.state.monitoringActive = true;
        this.results.status = 'active';
        this.markStepCompleted('start_monitoring');
      },
      async () => {
        console.log(`[${this.sagaId}] Compensating campaign monitoring`);
        // Stop monitoring and cancel end scheduling
        await this.stopCampaignMonitoring();
        this.state.monitoringActive = false;
      }
    );
  }

  protected async executeNextStep(): Promise<void> {
    const steps = ['identify_products', 'validate_pricing_rules', 'schedule_campaign', 'apply_campaign_pricing', 'start_monitoring'];

    for (const stepId of steps) {
      if (!this.state.completedSteps?.includes(stepId)) {
        try {
          this.state.currentStep = stepId;
          const step = this.steps.find(s => s.id === stepId);

          if (step) {
            await step.operation();
          }
        } catch (error) {
          console.error(`[${this.sagaId}] Step ${stepId} failed: `, error);

          // Record error
          this.state.errors.push({
            step: stepId,
            error: error instanceof Error ? error.message : String(error),
            timestamp: this.dateTimeService.now()
          });

          // For campaign management, we want to continue with partial success
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

          // Max retries reached, compensate and fail
          await this.compensate();
          throw error;
        }
      }
    }
  }

  protected async processEvent(event: any): Promise<void> {
    // Handle campaign-related events

    switch (event.eventType) {
      case 'CampaignStartScheduled':
        if (event.payload.campaignId === this.state.campaignId) {
          console.log(`[${this.sagaId}] Campaign start scheduled`);
          this.state.scheduledCampaigns.push('start');
        }
        break;

      case 'CampaignEndScheduled':
        if (event.payload.campaignId === this.state.campaignId) {
          console.log(`[${this.sagaId}] Campaign end scheduled`);
          this.state.scheduledCampaigns.push('end');
        }
        break;

      case 'CampaignStartTimeReached':
        if (event.payload.campaignId === this.state.campaignId && !this.state.campaignApplied) {
          console.log(`[${this.sagaId}] Campaign start time reached, applying pricing`);
          // Trigger pricing application
          await this.startCampaignImmediately();
        }
        break;

      case 'CampaignEndTimeReached':
        if (event.payload.campaignId === this.state.campaignId) {
          console.log(`[${this.sagaId}] Campaign end time reached`);
          await this.endCampaign();
        }
        break;

      case 'ProductViewed':
        // Track campaign engagement
        if (this.results.appliedProducts.includes(event.payload.productId)) {
          this.state.campaignMetrics.views++;
        }
        break;

      case 'ProductPurchased':
        // Track campaign conversions
        if (this.results.appliedProducts.includes(event.payload.productId)) {
          this.state.campaignMetrics.conversions++;
          this.state.campaignMetrics.revenue += event.payload.revenue || 0;
        }
        break;
    }
  }

  // Helper methods

  private canContinueWithPartialSuccess(stepId: string): boolean {
    // For campaign management, continue with partial success for non-critical steps
    return ['validate_pricing_rules', 'apply_campaign_pricing', 'start_monitoring'].includes(stepId);
  }

  private async getProductsInCategory(categoryId: string): Promise<string[]> {
    // In a real implementation, this would query products by category
    // For now, return empty array
    return [];
  }

  private async validatePricingRule(rule: CampaignPricingRule): Promise<void> {
    // Validate rule configuration
    if (!rule.ruleId || !rule.ruleType) {
      throw new Error('Rule ID and type are required');
    }

    if (rule.value < 0) {
      throw new Error('Rule value cannot be negative');
    }

    // Validate rule-specific constraints
    switch (rule.ruleType) {
      case 'percentage_discount':
        if (rule.value > 100) {
          throw new Error('Percentage discount cannot exceed 100%');
        }
        break;

      case 'fixed_discount':
        if (rule.value <= 0) {
          throw new Error('Fixed discount must be greater than 0');
        }
        break;
    }
  }

  private async scheduleCampaignStart(): Promise<void> {
    // Schedule campaign to start at specified time
    await this.eventPublisher.publish({
      eventId: this.idGenerator.generate(),
      eventType: 'CampaignStartScheduled',
      aggregateId: this.state.campaignId,
      version: 1,
      timestamp: this.dateTimeService.now(),
      payload: {
        campaignId: this.state.campaignId,
        scheduledStartTime: this.state.schedule.startDate,
        timezone: this.state.schedule.timezone
      }
    });
  }

  private async startCampaignImmediately(): Promise<void> {
    // Apply campaign pricing immediately
    console.log(`[${this.sagaId}] Starting campaign ${this.state.campaignId} immediately`);
    // The pricing application is handled in the next step
  }

  private async cancelScheduledCampaign(): Promise<void> {
    // Cancel any scheduled campaign tasks
    await this.eventPublisher.publish({
      eventId: this.idGenerator.generate(),
      eventType: 'CampaignStartCancelled',
      aggregateId: this.state.campaignId,
      version: 1,
      timestamp: this.dateTimeService.now(),
      payload: {
        campaignId: this.state.campaignId
      }
    });
  }

  private async calculateCampaignPrice(productId: string): Promise<any> {
    const product = await this.productRepository.findById(productId);
    if (!product) return null;

    // Store original price for compensation
    this.state.originalPrices.set(productId, { ...product.price });

    // Apply highest priority pricing rule
    const applicableRules = this.state.pricingRules
      .filter((rule: CampaignPricingRule) => this.ruleAppliesToProduct(rule, product))
      .sort((a: CampaignPricingRule, b: CampaignPricingRule) => b.priority - a.priority);

    if (applicableRules.length === 0) return null;

    const bestRule = applicableRules[0];
    const campaignPrice = this.applyPricingRule(bestRule, product.price);

    // Track pricing change
    this.results.pricingChanges.push({
      productId,
      originalPrice: product.price.amount,
      campaignPrice: campaignPrice.amount,
      discountAmount: product.price.amount - campaignPrice.amount,
      discountPercent: ((product.price.amount - campaignPrice.amount) / product.price.amount) * 100
    });

    return campaignPrice;
  }

  private ruleAppliesToProduct(rule: CampaignPricingRule, product: any): boolean {
    // Check if rule conditions are met
    if (!rule.conditions) return true;

    return rule.conditions.every(condition => {
      // Simplified condition checking
      return true; // In real implementation, check actual conditions
    });
  }

  private applyPricingRule(rule: CampaignPricingRule, originalPrice: any): any {
    switch (rule.ruleType) {
      case 'fixed_discount':
        return {
          amount: Math.max(0, originalPrice.amount - rule.value),
          currency: originalPrice.currency
        };

      case 'percentage_discount':
        return {
          amount: originalPrice.amount * (1 - rule.value / 100),
          currency: originalPrice.currency
        };

      case 'fixed_price':
        return {
          amount: rule.value,
          currency: originalPrice.currency
        };

      default:
        return originalPrice;
    }
  }

  private async applyCampaignPrice(productId: string, campaignPrice: any): Promise<void> {
    const currentProduct = await this.productRepository.findById(productId);
    if (!currentProduct) return;

    const updatedProduct = {
      ...currentProduct,
      price: campaignPrice,
      campaignId: this.state.campaignId,
      updatedAt: this.dateTimeService.now()
    };

    await this.productRepository.save(updatedProduct);
  }

  private calculateCampaignMetrics(): void {
    const changes = this.results.pricingChanges;

    this.results.metrics = {
      totalProductsAffected: changes.length,
      totalRevenueImpact: changes.reduce((sum, change) => sum + change.discountAmount, 0),
      averageDiscountPercent: changes.length > 0
        ? changes.reduce((sum, change) => sum + change.discountPercent, 0) / changes.length
        : 0,
      campaignReach: this.state.identifiedProducts.length
    };
  }

  private async scheduleCampaignEnd(): Promise<void> {
    await this.eventPublisher.publish({
      eventId: this.idGenerator.generate(),
      eventType: 'CampaignEndScheduled',
      aggregateId: this.state.campaignId,
      version: 1,
      timestamp: this.dateTimeService.now(),
      payload: {
        campaignId: this.state.campaignId,
        scheduledEndTime: this.state.schedule.endDate,
        timezone: this.state.schedule.timezone,
        autoRevert: this.state.autoRevert
      }
    });
  }

  private async endCampaign(): Promise<void> {
    console.log(`[${this.sagaId}] Ending campaign ${this.state.campaignId} `);

    this.results.status = 'expired';
    this.results.endedAt = this.dateTimeService.now();

    if (this.state.autoRevert) {
      // Revert campaign pricing
      await this.revertCampaignPricing();
    }

    // Publish campaign ended event
    await this.eventPublisher.publish({
      eventId: this.idGenerator.generate(),
      eventType: 'CampaignEnded',
      aggregateId: this.state.campaignId,
      version: 1,
      timestamp: this.dateTimeService.now(),
      payload: {
        campaignId: this.state.campaignId,
        finalMetrics: this.results.metrics,
        totalConversions: this.state.campaignMetrics.conversions,
        totalRevenue: this.state.campaignMetrics.revenue,
        autoReverted: this.state.autoRevert
      }
    });

    // Stop monitoring
    await this.stopCampaignMonitoring();
  }

  private async revertCampaignPricing(): Promise<void> {
    console.log(`[${this.sagaId}] Reverting campaign pricing for ${this.results.appliedProducts.length} products`);

    for (const productId of this.results.appliedProducts) {
      try {
        const originalPrice = this.state.originalPrices.get(productId);
        if (originalPrice) {
          await this.applyCampaignPrice(productId, originalPrice);
        }
      } catch (error) {
        console.error(`[${this.sagaId}] Failed to revert pricing for product ${productId}: `, error instanceof Error ? error.message : String(error));
      }
    }
  }

  private async stopCampaignMonitoring(): Promise<void> {
    // Stop any active monitoring
    this.state.monitoringActive = false;
  }

  // Public method to get current results
  public getResults(): CampaignResult {
    return { ...this.results };
  }

  // Public method to manually end campaign
  public async manuallyEndCampaign(): Promise<void> {
    await this.endCampaign();
  }
}
