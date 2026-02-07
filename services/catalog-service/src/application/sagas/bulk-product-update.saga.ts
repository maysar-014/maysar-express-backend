import {
  ProductRepository,
  CategoryRepository,
  DomainEventPublisher,
  IdGenerator,
  DateTimeService
} from '../../domain/interfaces';
import { DistributedSagaOrchestrator, SagaStep } from '../../../../../shared/saga/saga.orchestrator';
import { ISagaLogRepository } from '../../../../../shared/saga/saga.log';

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

  constructor(
    sagaLogRepository: ISagaLogRepository,
    serviceName: string,
    private readonly productRepository: ProductRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly eventPublisher: DomainEventPublisher,
    private readonly idGenerator: IdGenerator,
    private readonly dateTimeService: DateTimeService,
    outbox?: any
  ) {
    super(sagaLogRepository, serviceName, outbox);
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
        },
        compensate: async (context: BulkProductUpdateContext, sagaId: string) => {
          console.log(`[${sagaId}] Compensating notifications`);
        }
      }
    ];
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

