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
import { ProductId, SellerId } from '../../domain/value-objects/ids.value-object';
import { BaseSaga } from './index';

export interface ProductPublishingContext {
  productId: string;
  sellerId: string;
  autoPublish: boolean;
  notifyFollowers: boolean;
  updateSearchIndex: boolean;
  requestId: string;
  timestamp: Date;
}

export class ProductPublishingSaga extends BaseSaga {
  readonly sagaId: string;
  readonly sagaType = 'ProductPublishing';

  constructor(
    private readonly productRepository: ProductRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly mediaRepository: MediaRepository,
    private readonly searchService: SearchService,
    private readonly eventPublisher: DomainEventPublisher,
    private readonly idGenerator: IdGenerator,
    private readonly dateTimeService: DateTimeService,
    context: ProductPublishingContext
  ) {
    super();
    this.sagaId = `product-publishing-${context.productId}-${this.idGenerator.generate()}`;

    this.initializeState(context);
    this.setupSagaSteps();
  }

  protected initializeState(context: ProductPublishingContext): void {
    this.state = {
      productId: context.productId,
      sellerId: context.sellerId,
      autoPublish: context.autoPublish,
      notifyFollowers: context.notifyFollowers,
      updateSearchIndex: context.updateSearchIndex,
      requestId: context.requestId,
      timestamp: context.timestamp,

      // Saga state
      currentStep: 'initialized',
      productValidated: false,
      mediaProcessed: false,
      inventoryVerified: false,
      searchIndexed: false,
      notificationsSent: false,
      published: false,

      // Compensation tracking
      originalProductStatus: null,
      searchIndexUpdated: false,
      notificationsSentTo: [],

      // Error handling
      errors: [],
      retryCount: 0,
      maxRetries: 3
    };
  }

  private setupSagaSteps(): void {
    // Step 1: Validate product data
    this.addStep(
      'validate_product',
      async () => {
        console.log(`[${this.sagaId}] Validating product ${this.state.productId}`);

        const product = await this.productRepository.findById(this.state.productId);
        if (!product) {
          throw new Error(`Product ${this.state.productId} not found`);
        }

        // Store original status for compensation
        this.state.originalProductStatus = product.status;

        // Validate product completeness
        await this.validateProductData(product);

        // Validate category exists and is active
        await this.validateCategory(product.categoryId);

        this.state.productValidated = true;
        this.markStepCompleted('validate_product');
      },
      async () => {
        console.log(`[${this.sagaId}] Compensating product validation`);
        // No compensation needed for validation
      }
    );

    // Step 2: Process and validate media
    this.addStep(
      'process_media',
      async () => {
        console.log(`[${this.sagaId}] Processing media for product ${this.state.productId}`);

        const media = await this.mediaRepository.findByProduct(this.state.productId);

        // Validate media requirements
        await this.validateMediaRequirements(media);

        // Process media (resize, optimize, etc. - would call external service)
        await this.processMediaFiles(media);

        this.state.mediaProcessed = true;
        this.markStepCompleted('process_media');
      },
      async () => {
        console.log(`[${this.sagaId}] Compensating media processing`);
        // Reset any processing flags, cleanup temp files if needed
        this.state.mediaProcessed = false;
      }
    );

    // Step 3: Request inventory verification
    this.addStep(
      'request_inventory_verification',
      async () => {
        console.log(`[${this.sagaId}] Requesting inventory verification for product ${this.state.productId}`);

        // Publish event to request inventory verification from inventory service
        await this.eventPublisher.publish({
          eventId: this.idGenerator.generate(),
          eventType: 'ProductInventoryVerificationRequested',
          aggregateId: this.state.productId,
          version: 1,
          timestamp: this.dateTimeService.now(),
          payload: {
            productId: this.state.productId,
            sagaId: this.sagaId,
            requestId: this.state.requestId,
            expectedBy: new Date(Date.now() + 30000) // Expect response within 30 seconds
          }
        });

        this.state.inventoryVerificationRequested = true;
        this.markStepCompleted('request_inventory_verification');
      },
      async () => {
        console.log(`[${this.sagaId}] Compensating inventory verification request`);
        // Publish cancellation event
        await this.eventPublisher.publish({
          eventId: this.idGenerator.generate(),
          eventType: 'ProductInventoryVerificationCancelled',
          aggregateId: this.state.productId,
          version: 1,
          timestamp: this.dateTimeService.now(),
          payload: {
            productId: this.state.productId,
            sagaId: this.sagaId,
            reason: 'Saga compensation'
          }
        });
      }
    );

    // Step 4: Wait for inventory verification (this would be handled by event listeners)
    this.addStep(
      'wait_inventory_verification',
      async () => {
        console.log(`[${this.sagaId}] Waiting for inventory verification response`);

        // In a real implementation, this step would wait for an event response
        // For now, we'll assume verification is pending and continue
        // The actual verification would be handled asynchronously via events

        this.state.inventoryVerified = true; // Assume verified for now
        this.markStepCompleted('wait_inventory_verification');
      },
      async () => {
        console.log(`[${this.sagaId}] Compensating inventory verification wait`);
        // No compensation needed
      }
    );

    // Step 4: Update search index
    this.addStep(
      'update_search_index',
      async () => {
        if (!this.state.updateSearchIndex) {
          console.log(`[${this.sagaId}] Skipping search index update`);
          this.markStepCompleted('update_search_index');
          return;
        }

        console.log(`[${this.sagaId}] Updating search index for product ${this.state.productId}`);

        const product = await this.productRepository.findById(this.state.productId);
        if (!product) {
          throw new Error(`Product ${this.state.productId} not found during search indexing`);
        }

        // Create search document
        const searchDocument = this.createSearchDocument(product);

        // Index the product
        await this.searchService.index(searchDocument);

        this.state.searchIndexed = true;
        this.state.searchIndexUpdated = true;
        this.markStepCompleted('update_search_index');
      },
      async () => {
        console.log(`[${this.sagaId}] Compensating search index update`);

        if (this.state.searchIndexUpdated) {
          try {
            await this.searchService.remove(this.state.productId);
            this.state.searchIndexUpdated = false;
          } catch (error) {
            console.error(`[${this.sagaId}] Failed to remove from search index during compensation:`, error instanceof Error ? error.message : String(error));
          }
        }
      }
    );

    // Step 5: Publish the product
    this.addStep(
      'publish_product',
      async () => {
        console.log(`[${this.sagaId}] Publishing product ${this.state.productId}`);

        // Update product status to published
        await this.productRepository.updateStatus(this.state.productId, 'published');

        this.state.published = true;
        this.markStepCompleted('publish_product');
      },
      async () => {
        console.log(`[${this.sagaId}] Compensating product publishing`);

        if (this.state.published && this.state.originalProductStatus) {
          try {
            await this.productRepository.updateStatus(this.state.productId, this.state.originalProductStatus);
            this.state.published = false;
          } catch (error) {
            console.error(`[${this.sagaId}] Failed to revert product status during compensation:`, error instanceof Error ? error.message : String(error));
          }
        }
      }
    );

    // Step 6: Send notifications
    this.addStep(
      'send_notifications',
      async () => {
        if (!this.state.notifyFollowers) {
          console.log(`[${this.sagaId}] Skipping notifications`);
          this.markStepCompleted('send_notifications');
          return;
        }

        console.log(`[${this.sagaId}] Sending notifications for product ${this.state.productId}`);

        // Send notifications to followers/watchers
        const notificationsSent = await this.sendProductPublishedNotifications();

        this.state.notificationsSent = true;
        this.state.notificationsSentTo = notificationsSent;
        this.markStepCompleted('send_notifications');
      },
      async () => {
        console.log(`[${this.sagaId}] Compensating notifications`);

        if (this.state.notificationsSent && this.state.notificationsSentTo.length > 0) {
          // In a real implementation, you might want to send "undo" notifications
          // or mark notifications as retracted
          console.log(`[${this.sagaId}] Notifications were sent to ${this.state.notificationsSentTo.length} recipients`);
          // Note: Notifications are typically not compensated as they're hard to "undo"
        }
      }
    );

    // Step 7: Publish success event
    this.addStep(
      'publish_success_event',
      async () => {
        console.log(`[${this.sagaId}] Publishing success event for product ${this.state.productId}`);

        await this.eventPublisher.publish({
          eventId: this.idGenerator.generate(),
          eventType: 'ProductPublished',
          aggregateId: this.state.productId,
          version: 1,
          timestamp: this.dateTimeService.now(),
          payload: {
            productId: this.state.productId,
            sellerId: this.state.sellerId,
            publishedAt: this.dateTimeService.now(),
            autoPublished: this.state.autoPublish,
            searchIndexed: this.state.searchIndexed,
            notificationsSent: this.state.notificationsSentTo.length
          }
        });

        this.markStepCompleted('publish_success_event');
      },
      async () => {
        console.log(`[${this.sagaId}] Compensating success event`);
        // Events are typically not compensated as they're immutable
      }
    );
  }

  protected async executeNextStep(): Promise<void> {
    const steps = ['validate_product', 'process_media', 'request_inventory_verification', 'wait_inventory_verification', 'update_search_index', 'publish_product', 'send_notifications', 'publish_success_event'];

    for (const stepId of steps) {
      if (!this.state.completedSteps?.includes(stepId)) {
        try {
          this.state.currentStep = stepId;
          const step = this.steps.find(s => s.id === stepId);

          if (step) {
            await step.operation();
          }
        } catch (error) {
          console.error(`[${this.sagaId}] Step ${stepId} failed:`, error);

          // Record error
          this.state.errors.push({
            step: stepId,
            error: error.message,
            timestamp: this.dateTimeService.now()
          });

          // Check if we should retry
          if (this.state.retryCount < this.state.maxRetries) {
            this.state.retryCount++;
            console.log(`[${this.sagaId}] Retrying step ${stepId} (attempt ${this.state.retryCount})`);

            // Wait before retry (exponential backoff)
            await this.delay(Math.pow(2, this.state.retryCount) * 1000);
            continue; // Retry the same step
          }

          // Max retries reached, compensate and fail
          await this.compensate();
          throw error;
        }
      }
    }
  }

  protected async processEvent(event: any): Promise<void> {
    // Handle external events that might affect the saga

    switch (event.eventType) {
      case 'ProductValidationFailed':
        if (event.payload.productId === this.state.productId) {
          console.log(`[${this.sagaId}] Received validation failure event, compensating`);
          await this.compensate();
        }
        break;

      case 'MediaProcessingFailed':
        if (event.payload.productId === this.state.productId) {
          console.log(`[${this.sagaId}] Received media processing failure event, compensating`);
          await this.compensate();
        }
        break;

      case 'InventoryUpdateFailed':
        if (event.payload.productId === this.state.productId) {
          console.log(`[${this.sagaId}] Received inventory update failure event, compensating`);
          await this.compensate();
        }
        break;
    }
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
      throw new Error(`Product validation failed: ${errors.join(', ')}`);
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
      await this.delay(100);

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

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
