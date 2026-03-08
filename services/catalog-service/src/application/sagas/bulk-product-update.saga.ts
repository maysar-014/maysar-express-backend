import {
  ProductRepository,
  CategoryRepository,
  DomainEventPublisher,
  IdGenerator,
  DateTimeService
} from '../../domain/interfaces';
import { DistributedSagaOrchestrator, SagaStep } from '../../../../../shared/saga/saga.orchestrator';
import { ISagaLogRepository } from '../../../../../shared/saga/saga.log';
type SagaOutbox = ConstructorParameters<typeof DistributedSagaOrchestrator<any>>[2];

const noopSagaLogRepository: ISagaLogRepository = {
  save: async () => { },
  update: async () => { },
  getById: async () => null,
  saveStep: async () => { },
  updateStep: async () => { },
  getSteps: async () => [],
  findStuck: async () => [],
};

export interface BulkProductUpdateContext {
  productIds: string[];
  updates: Record<string, any>;
  updateType: 'price' | 'status' | 'category' | 'attributes' | 'visibility';
  sellerId?: string;
  validateBusinessRules: boolean;
  requestId: string;
  timestamp: Date;
  // Progress tracking
  processedProducts?: string[];
  successfulUpdates?: string[];
  failedUpdates?: string[];
  skippedProducts?: string[];
  // Results
  successful?: string[];
  failed?: Array<{ productId: string; error: string }>;
  skipped?: Array<{ productId: string; reason: string }>;
  // Compensation tracking
  originalStates?: Record<string, any>; // productId -> original state
  appliedUpdates?: Record<string, any>; // productId -> applied changes
}

export class BulkProductUpdateSaga extends DistributedSagaOrchestrator<BulkProductUpdateContext> {
  protected sagaType = 'BulkProductUpdate';
  private readonly productRepository: ProductRepository;
  private readonly categoryRepository: CategoryRepository;
  private readonly eventPublisher: DomainEventPublisher;
  private readonly idGenerator: IdGenerator;
  private readonly dateTimeService: DateTimeService;
  private lastContext: BulkProductUpdateContext | null;
  private completed: boolean;

  constructor(
    sagaLogRepository: ISagaLogRepository,
    serviceName: string,
    productRepository: ProductRepository,
    categoryRepository: CategoryRepository,
    eventPublisher: DomainEventPublisher,
    idGenerator: IdGenerator,
    dateTimeService: DateTimeService,
    outbox?: SagaOutbox
  );
  constructor(
    productRepository: ProductRepository,
    categoryRepository: CategoryRepository,
    eventPublisher: DomainEventPublisher,
    idGenerator: IdGenerator,
    dateTimeService: DateTimeService,
    _legacyContext?: BulkProductUpdateContext
  );
  constructor(
    arg1: ISagaLogRepository | ProductRepository,
    arg2: string | CategoryRepository,
    arg3: ProductRepository | DomainEventPublisher,
    arg4: CategoryRepository | IdGenerator,
    arg5: DomainEventPublisher | DateTimeService,
    arg6?: IdGenerator | BulkProductUpdateContext,
    arg7?: DateTimeService,
    arg8?: SagaOutbox
  ) {
    const isOrchestratedMode = typeof arg2 === 'string';
    const sagaLogRepository = isOrchestratedMode ? (arg1 as ISagaLogRepository) : noopSagaLogRepository;
    const serviceName = isOrchestratedMode ? (arg2 as string) : 'catalog-service';
    const outbox = isOrchestratedMode ? arg8 : undefined;
    super(sagaLogRepository, serviceName, outbox);

    this.lastContext = null;
    this.completed = false;

    if (isOrchestratedMode) {
      this.productRepository = arg3 as ProductRepository;
      this.categoryRepository = arg4 as CategoryRepository;
      this.eventPublisher = arg5 as DomainEventPublisher;
      this.idGenerator = arg6 as IdGenerator;
      this.dateTimeService = arg7 as DateTimeService;
      return;
    }
    this.productRepository = arg1 as ProductRepository;
    this.categoryRepository = arg2 as CategoryRepository;
    this.eventPublisher = arg3 as DomainEventPublisher;
    this.idGenerator = arg4 as IdGenerator;
    this.dateTimeService = arg5 as DateTimeService;
  }

  public override async start(
    payload: BulkProductUpdateContext,
    correlationId?: string
  ): Promise<string> {
    this.lastContext = payload;
    this.completed = false;
    return super.start(payload, correlationId);
  }

  protected defineSteps(): SagaStep<BulkProductUpdateContext>[] {
    return [
      {
        name: 'validate_products',
        execute: async (context: BulkProductUpdateContext, sagaId: string) => {
          console.log(`[${sagaId}] Validating ${context.productIds.length} products`);
          context.processedProducts = [];
          context.originalStates = {};
          context.skipped = [];
          context.failed = [];

          for (const productId of context.productIds) {
            try {
              const product = await this.productRepository.findById(productId);
              if (!product) {
                context.skipped.push({ productId, reason: 'Product not found' });
                continue;
              }

              if (context.sellerId && product.sellerId !== context.sellerId) {
                context.skipped.push({ productId, reason: 'Access denied' });
                continue;
              }

              context.originalStates[productId] = { ...product };
              context.processedProducts.push(productId);
            } catch (error) {
              context.failed.push({
                productId,
                error: `Validation failed: ${error instanceof Error ? error.message : String(error)}`
              });
            }
          }

          if (context.processedProducts.length === 0) {
            throw new Error('No valid products to update');
          }
        },
        compensate: async (context: BulkProductUpdateContext, sagaId: string) => {
          console.log(`[${sagaId}] Compensating product validation`);
          context.processedProducts = [];
          context.originalStates = {};
        }
      },
      {
        name: 'prepare_updates',
        execute: async (context: BulkProductUpdateContext, sagaId: string) => {
          console.log(`[${sagaId}] Preparing updates for ${context.processedProducts?.length} products`);
          context.appliedUpdates = {};
          context.successfulUpdates = [];
          context.failedUpdates = [];

          for (const productId of context.processedProducts || []) {
            try {
              const originalProduct = context.originalStates?.[productId];
              const preparedUpdate = await this.prepareUpdate(productId, originalProduct, context, sagaId);

              if (preparedUpdate.valid) {
                context.appliedUpdates[productId] = preparedUpdate.update;
                context.successfulUpdates.push(productId);
              } else {
                context.failed?.push({
                  productId,
                  error: preparedUpdate.reason || 'Update preparation failed'
                });
                context.failedUpdates.push(productId);
              }
            } catch (error) {
              context.failed?.push({
                productId,
                error: `Update preparation failed: ${error instanceof Error ? error.message : String(error)}`
              });
              context.failedUpdates.push(productId);
            }
          }

          if (context.successfulUpdates.length === 0) {
            throw new Error('No valid updates to apply');
          }
        },
        compensate: async (context: BulkProductUpdateContext, sagaId: string) => {
          console.log(`[${sagaId}] Compensating update preparation`);
          context.appliedUpdates = {};
          context.successfulUpdates = [];
        }
      },
      {
        name: 'apply_updates',
        execute: async (context: BulkProductUpdateContext, sagaId: string) => {
          console.log(`[${sagaId}] Applying updates to ${context.successfulUpdates?.length} products`);
          context.successful = [];

          for (const productId of context.successfulUpdates || []) {
            try {
              const update = context.appliedUpdates?.[productId];
              if (!update) continue;

              await this.applyProductUpdate(productId, update);
              context.successful.push(productId);
            } catch (error) {
              context.failed?.push({
                productId,
                error: `Update application failed: ${error instanceof Error ? error.message : String(error)}`
              });
            }
          }

          if (context.successful.length === 0) {
            throw new Error('All updates failed to apply');
          }
        },
        compensate: async (context: BulkProductUpdateContext, sagaId: string) => {
          console.log(`[${sagaId}] Compensating applied updates`);
          for (const productId of context.successful || []) {
            try {
              const originalState = context.originalStates?.[productId];
              if (originalState) {
                await this.productRepository.save(originalState);
              }
            } catch (error) {
              console.error(`[${sagaId}] Failed to rollback product ${productId}:`, error instanceof Error ? error.message : String(error));
            }
          }
        }
      },
      {
        name: 'send_notifications',
        execute: async (context: BulkProductUpdateContext, sagaId: string) => {
          console.log(`[${sagaId}] Sending notifications for ${context.successful?.length} updated products`);

          await (this as any).publishCommand('BulkProductUpdateCompleted', {
            sagaId: sagaId,
            updateType: context.updateType,
            totalProducts: context.processedProducts?.length || 0,
            successfulUpdates: context.successful?.length || 0,
            failedUpdates: context.failed?.length || 0,
            productIds: context.successful,
            updates: context.updates,
            requestId: context.requestId
          }, context.requestId, sagaId);

          for (const productId of context.successful || []) {
            const update = context.appliedUpdates?.[productId];
            if (update) {
              await (this as any).publishCommand('ProductUpdated', {
                productId,
                changes: update,
                bulkUpdateId: sagaId,
                updateType: context.updateType
              }, context.requestId, sagaId);
            }
          }
          this.completed = true;
        },
        compensate: async (context: BulkProductUpdateContext, sagaId: string) => {
          console.log(`[${sagaId}] Compensating notifications`);
          this.completed = false;
        }
      }
    ];
  }

  public getState(): BulkProductUpdateContext {
    return this.lastContext ?? {
      productIds: [],
      updates: {},
      updateType: 'status',
      validateBusinessRules: false,
      requestId: '',
      timestamp: new Date(),
    };
  }

  public isCompleted(): boolean {
    return this.completed;
  }

  public getResults(): {
    successful: string[];
    failed: Array<{ productId: string; error: string }>;
    skipped: Array<{ productId: string; reason: string }>;
    totalProcessed: number;
    totalSuccessful: number;
    totalFailed: number;
  } {
    const context = this.lastContext;
    const successful = context?.successful ?? [];
    const failed = context?.failed ?? [];
    const skipped = context?.skipped ?? [];

    return {
      successful,
      failed,
      skipped,
      totalProcessed: context?.processedProducts?.length ?? 0,
      totalSuccessful: successful.length,
      totalFailed: failed.length,
    };
  }

  public async handleEvent(event: {
    eventType?: string;
    payload?: Record<string, unknown>;
  }): Promise<void> {
    const context = this.lastContext;
    if (!context) return;

    if (event.eventType === 'ProductDeleted') {
      const productId = typeof event.payload?.productId === 'string' ? event.payload.productId : '';
      if (productId) {
        context.productIds = context.productIds.filter((id) => id !== productId);
      }
      return;
    }

    if (
      event.eventType === 'CategoryDeactivated'
      && context.updateType === 'category'
      && context.updates.categoryId === event.payload?.categoryId
    ) {
      await this.compensate();
    }
  }

  public override async compensate(
    sagaId?: string,
    payload?: BulkProductUpdateContext,
    stepIndex?: number
  ): Promise<void> {
    this.completed = false;
    if (sagaId && payload && typeof stepIndex === 'number') {
      this.lastContext = payload;
      await super.compensate(sagaId, payload, stepIndex);
    }
  }

  // Helper methods
  private async prepareUpdate(productId: string, originalProduct: any, context: BulkProductUpdateContext, sagaId: string): Promise<{
    valid: boolean;
    update?: any;
    reason?: string;
  }> {
    try {
      const update = { ...context.updates };

      switch (context.updateType) {
        case 'price':
          const validation = await this.validatePriceUpdate(update, originalProduct, context.validateBusinessRules);
          if (!validation.valid) return { valid: false, reason: validation.reason };
          break;
        case 'status':
          const statusValidation = await this.validateStatusUpdate(update, originalProduct);
          if (!statusValidation.valid) return { valid: false, reason: statusValidation.reason };
          break;
        case 'category':
          const categoryValidation = await this.validateCategoryUpdate(update, originalProduct);
          if (!categoryValidation.valid) return { valid: false, reason: categoryValidation.reason };
          break;
      }

      update.updatedAt = this.dateTimeService.now();
      update.bulkUpdateId = sagaId;

      return { valid: true, update };
    } catch (error) {
      return {
        valid: false,
        reason: `Update preparation failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  private async validatePriceUpdate(update: any, originalProduct: any, validateRules: boolean): Promise<{ valid: boolean; reason?: string }> {
    if (!update.price || update.price.amount <= 0) return { valid: false, reason: 'Invalid price specified' };
    const originalPrice = originalProduct.price?.amount || 0;
    const newPrice = update.price.amount;
    const changePercent = originalPrice === 0 ? 100 : Math.abs((newPrice - originalPrice) / originalPrice) * 100;

    if (changePercent > 50 && validateRules) {
      return { valid: false, reason: `Price change of ${changePercent.toFixed(1)}% exceeds 50% limit` };
    }
    return { valid: true };
  }

  private async validateStatusUpdate(update: any, originalProduct: any): Promise<{ valid: boolean; reason?: string }> {
    const validStatuses = ['draft', 'published', 'archived', 'suspended'];
    if (!validStatuses.includes(update.status)) return { valid: false, reason: `Invalid status: ${update.status}` };
    if (originalProduct.status === 'archived' && update.status !== 'archived') return { valid: false, reason: 'Cannot change status of archived products' };
    return { valid: true };
  }

  private async validateCategoryUpdate(update: any, originalProduct: any): Promise<{ valid: boolean; reason?: string }> {
    if (!update.categoryId) return { valid: false, reason: 'Category ID is required' };
    const category = await this.categoryRepository.findById(update.categoryId);
    if (!category) return { valid: false, reason: 'Category not found' };
    if (category.status !== 'active') return { valid: false, reason: 'Category is not active' };
    return { valid: true };
  }

  private async applyProductUpdate(productId: string, update: any): Promise<void> {
    const currentProduct = await this.productRepository.findById(productId);
    if (!currentProduct) throw new Error(`Product ${productId} not found during update`);
    const updatedProduct = { ...currentProduct, ...update };
    await this.productRepository.save(updatedProduct);
  }
}

