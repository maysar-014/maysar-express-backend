/**
 * Product Publishing Saga
 * Orchestrates the complex process of publishing a product to the catalog
 * Handles validation, media processing, search indexing, and notifications
 */

import {
  ProductRepository,
  CategoryRepository,
  MediaRepository,
  SearchService,
  DomainEventPublisher,
  IdGenerator,
  DateTimeService
} from '../../domain/interfaces';
import { DistributedSagaOrchestrator, SagaStep } from '../../../../../shared/saga/saga.orchestrator';
import { ISagaLogRepository } from '../../../../../shared/saga/saga.log';
import { ProductId, SellerId } from '../../domain/value-objects/ids.value-object';

export interface ProductPublishingContext {
  productId: string;
  sellerId: string;
  autoPublish: boolean;
  notifyFollowers: boolean;
  updateSearchIndex: boolean;
  requestId: string;
  timestamp: Date;
  // State fields that were in this.state before
  currentStep?: string;
  productValidated?: boolean;
  mediaProcessed?: boolean;
  inventoryVerified?: boolean; // This state is implicitly managed by the orchestrator waiting for events
  inventoryVerificationRequested?: boolean; // This state is implicitly managed by the orchestrator waiting for events
  searchIndexed?: boolean;
  notificationsSent?: boolean;
  published?: boolean;
  originalProductStatus?: any;
  searchIndexUpdated?: boolean;
  notificationsSentTo?: string[];
  // Error handling
  errors?: { step: string; error: string; timestamp: Date }[];
  retryCount?: number;
  maxRetries?: number;
}

export class ProductPublishingSaga extends DistributedSagaOrchestrator<ProductPublishingContext> {
  protected sagaType = 'ProductPublishing';

  constructor(
    sagaLogRepository: ISagaLogRepository,
    serviceName: string,
    private readonly productRepository: ProductRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly mediaRepository: MediaRepository,
    private readonly searchService: SearchService,
    private readonly eventPublisher: DomainEventPublisher, // Retained for helper methods if needed, but orchestrator uses publishCommand
    private readonly idGenerator: IdGenerator, // Retained for helper methods if needed
    private readonly dateTimeService: DateTimeService,
    outbox?: any
  ) {
    super(sagaLogRepository, serviceName, outbox);
  }

  protected defineSteps(): SagaStep<ProductPublishingContext>[] {
    return [
      {
        name: 'validate_product',
        execute: async (context: ProductPublishingContext, sagaId: string) => {
          console.log(`[${sagaId}] Validating product ${context.productId}`);

          const product = await this.productRepository.findById(context.productId);
          if (!product) throw new Error(`Product ${context.productId} not found`);

          context.originalProductStatus = product.status;
          await this.validateProductData(product);
          await this.validateCategory(product.categoryId);
          context.productValidated = true;
        },
        compensate: async (context: ProductPublishingContext, sagaId: string) => {
          console.log(`[${sagaId}] Compensating product validation`);
        }
      },
      {
        name: 'process_media',
        execute: async (context: ProductPublishingContext, sagaId: string) => {
          console.log(`[${sagaId}] Processing media for product ${context.productId}`);

          const media = await this.mediaRepository.findByProduct(context.productId);
          await this.validateMediaRequirements(media);
          await this.processMediaFiles(media);
          context.mediaProcessed = true;
        },
        compensate: async (context: ProductPublishingContext, sagaId: string) => {
          console.log(`[${sagaId}] Compensating media processing`);
          context.mediaProcessed = false;
        }
      },
      {
        name: 'request_inventory_verification',
        execute: async (context: ProductPublishingContext, sagaId: string) => {
          console.log(`[${sagaId}] Requesting inventory verification for product ${context.productId}`);

          // Publish event to request inventory verification from inventory service
          await (this as any).publishCommand('ProductInventoryVerificationRequested', {
            productId: context.productId,
            sagaId: sagaId,
            requestId: context.requestId,
            expectedBy: new Date(Date.now() + 30000) // Expect response within 30 seconds
          }, context.requestId, sagaId);

          context.inventoryVerificationRequested = true;
        },
        compensate: async (context: ProductPublishingContext, sagaId: string) => {
          console.log(`[${sagaId}] Compensating inventory verification request`);
          // Publish cancellation event
          await (this as any).publishCommand('ProductInventoryVerificationCancelled', {
            productId: context.productId,
            sagaId: sagaId,
            reason: 'Saga compensation'
          }, context.requestId, sagaId);
        }
      },
      {
        name: 'update_search_index',
        execute: async (context: ProductPublishingContext, sagaId: string) => {
          if (!context.updateSearchIndex) {
            console.log(`[${sagaId}] Skipping search index update`);
            return;
          }

          console.log(`[${sagaId}] Updating search index for product ${context.productId}`);

          const product = await this.productRepository.findById(context.productId);
          if (!product) throw new Error(`Product ${context.productId} not found during search indexing`);

          // Create search document
          const searchDocument = this.createSearchDocument(product);

          // Index the product
          await this.searchService.index(searchDocument);

          context.searchIndexed = true;
          context.searchIndexUpdated = true;
        },
        compensate: async (context: ProductPublishingContext, sagaId: string) => {
          console.log(`[${sagaId}] Compensating search index update`);

          if (context.searchIndexUpdated) {
            await this.searchService.remove(context.productId);
            context.searchIndexUpdated = false;
          }
        }
      },
      {
        name: 'publish_product',
        execute: async (context: ProductPublishingContext, sagaId: string) => {
          console.log(`[${sagaId}] Publishing product ${context.productId}`);

          // Update product status to published
          await this.productRepository.updateStatus(context.productId, 'published');

          context.published = true;
        },
        compensate: async (context: ProductPublishingContext, sagaId: string) => {
          console.log(`[${sagaId}] Compensating product publishing`);

          if (context.published && context.originalProductStatus) {
            await this.productRepository.updateStatus(context.productId, context.originalProductStatus);
            context.published = false;
          }
        }
      },
      {
        name: 'send_notifications',
        execute: async (context: ProductPublishingContext, sagaId: string) => {
          if (!context.notifyFollowers) {
            console.log(`[${sagaId}] Skipping notifications`);
            return;
          }

          console.log(`[${sagaId}] Sending notifications for product ${context.productId}`);

          // Send notifications to followers/watchers
          const notificationsSent = await this.sendProductPublishedNotifications();

          context.notificationsSent = true;
          context.notificationsSentTo = notificationsSent;
        },
        compensate: async (context: ProductPublishingContext, sagaId: string) => {
          console.log(`[${sagaId}] Compensating notifications`);

          if (context.notificationsSent && context.notificationsSentTo && context.notificationsSentTo.length > 0) {
            console.log(`[${sagaId}] Notifications were sent to ${context.notificationsSentTo.length} recipients`);
          }
        }
      },
      {
        name: 'publish_success_event',
        execute: async (context: ProductPublishingContext, sagaId: string) => {
          console.log(`[${sagaId}] Publishing success event for product ${context.productId}`);

          await (this as any).publishCommand('ProductPublished', {
            productId: context.productId,
            sellerId: context.sellerId,
            publishedAt: this.dateTimeService.now(),
            autoPublished: context.autoPublish,
            searchIndexed: context.searchIndexed,
            notificationsSent: context.notificationsSentTo?.length || 0
          }, context.requestId, sagaId);
        },
        compensate: async (context: ProductPublishingContext, sagaId: string) => {
          console.log(`[${sagaId}] Compensating success event`);
        }
      }
    ];
  }

  // Response handlers for asynchronous steps
  async handleInventoryVerified(sagaId: string) {
    await this.completeStep(sagaId, 'request_inventory_verification');
  }

  async handleInventoryFailed(sagaId: string, reason: string) {
    await this.failStep(sagaId, 'request_inventory_verification', reason);
  }


  // Helper methods

  private async validateProductData(product: any): Promise<void> {
    const errors: string[] = [];

    if (!product.name || product.name.trim().length === 0) {
      errors.push('Product name is required');
    }

    if (!product.description || product.description.trim().length < 10) {
      errors.push('Product description must be at least 10 characters');
    }

    if (!product.price || product.price.amount <= 0) {
      errors.push('Product must have a valid price');
    }

    // Check for required attributes based on category
    // This would involve category-specific validation rules

    if (errors.length > 0) {
      throw new Error('Product validation failed');
    }
  }

  private async validateCategory(categoryId: string): Promise<void> {
    const category = await this.categoryRepository.findById(categoryId);
    if (!category) {
      throw new Error(`Category ${categoryId} not found`);
    }

    if (category.status !== 'active') {
      throw new Error(`Category ${categoryId} is not active`);
    }
  }

  private async validateMediaRequirements(media: any[]): Promise<void> {
    // Check for required media (at least one primary image)
    const hasPrimaryImage = media.some(m => m.type === 'image' && m.order === 0);

    if (!hasPrimaryImage) {
      throw new Error('Product must have at least one primary image');
    }

    // Validate media file sizes, formats, etc.
    for (const item of media) {
      if (item.size && item.size > 10 * 1024 * 1024) { // 10MB limit
        throw new Error(`Media file ${item.id} exceeds size limit`);
      }
    }
  }

  private async processMediaFiles(media: any[]): Promise<void> {
    // In a real implementation, this would:
    // 1. Resize images to multiple sizes
    // 2. Generate thumbnails
    // 3. Optimize file formats
    // 4. Upload to CDN
    // 5. Update media metadata

    // For now, we'll simulate processing
    for (const item of media) {
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 100));

      // Update processing status
      await this.mediaRepository.updateMetadata(item.id, {
        ...item.metadata,
        processed: true,
        processedAt: this.dateTimeService.now()
      });
    }
  }



  private createSearchDocument(product: any): any {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price.amount,
      currency: product.price.currency,
      categoryId: product.categoryId,
      sellerId: product.sellerId,
      type: product.type,
      tags: product.tags || [],
      attributes: product.attributes || {},
      status: 'published',
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,

      // Search-specific fields
      searchableText: `${product.name} ${product.description} ${product.tags?.join(' ') || ''}`,
      popularityScore: 0, // Would be calculated based on various factors
      averageRating: 0,
      reviewCount: 0
    };
  }

  private async sendProductPublishedNotifications(): Promise<string[]> {
    // In a real implementation, this would:
    // 1. Find users following the seller
    // 2. Find users watching similar products/categories
    // 3. Send notifications via email/push/in-app

    // For now, return mock recipients
    return [
      'user1@example.com',
      'user2@example.com',
      'follower@example.com'
    ];
  }
}
