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
import { SharpImageProvider, ImageProcessingProvider } from '../../infrastructure/providers/image-processing.provider';
import { externalServicesConfig } from '../../config/external-services.config';
import { eventBus } from '@shared/events/eventBus';
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
  private readonly productRepository: ProductRepository;
  private readonly categoryRepository: CategoryRepository;
  private readonly mediaRepository: MediaRepository;
  private readonly searchService: SearchService;
  private readonly eventPublisher: DomainEventPublisher;
  private readonly idGenerator: IdGenerator;
  private readonly dateTimeService: DateTimeService;
  private lastContext: ProductPublishingContext | null;
  private completed: boolean;

  constructor(
    sagaLogRepository: ISagaLogRepository,
    serviceName: string,
    productRepository: ProductRepository,
    categoryRepository: CategoryRepository,
    mediaRepository: MediaRepository,
    searchService: SearchService,
    eventPublisher: DomainEventPublisher,
    idGenerator: IdGenerator,
    dateTimeService: DateTimeService,
    outbox?: SagaOutbox
  );
  constructor(
    productRepository: ProductRepository,
    categoryRepository: CategoryRepository,
    mediaRepository: MediaRepository,
    searchService: SearchService,
    eventPublisher: DomainEventPublisher,
    idGenerator: IdGenerator,
    dateTimeService: DateTimeService,
    _legacyContext?: ProductPublishingContext
  );
  constructor(
    arg1: ISagaLogRepository | ProductRepository,
    arg2: string | CategoryRepository,
    arg3: ProductRepository | MediaRepository,
    arg4: CategoryRepository | SearchService,
    arg5: MediaRepository | DomainEventPublisher,
    arg6: SearchService | IdGenerator,
    arg7: DomainEventPublisher | DateTimeService,
    arg8?: IdGenerator | ProductPublishingContext,
    arg9?: DateTimeService,
    arg10?: SagaOutbox
  ) {
    const isOrchestratedMode = typeof arg2 === 'string';
    const sagaLogRepository = isOrchestratedMode ? (arg1 as ISagaLogRepository) : noopSagaLogRepository;
    const serviceName = isOrchestratedMode ? (arg2 as string) : 'catalog-service';
    const outbox = isOrchestratedMode ? arg10 : undefined;
    super(sagaLogRepository, serviceName, outbox);

    this.lastContext = null;
    this.completed = false;

    if (isOrchestratedMode) {
      this.productRepository = arg3 as ProductRepository;
      this.categoryRepository = arg4 as CategoryRepository;
      this.mediaRepository = arg5 as MediaRepository;
      this.searchService = arg6 as SearchService;
      this.eventPublisher = arg7 as DomainEventPublisher;
      this.idGenerator = arg8 as IdGenerator;
      this.dateTimeService = arg9 as DateTimeService;
      return;
    }
    this.productRepository = arg1 as ProductRepository;
    this.categoryRepository = arg2 as CategoryRepository;
    this.mediaRepository = arg3 as MediaRepository;
    this.searchService = arg4 as SearchService;
    this.eventPublisher = arg5 as DomainEventPublisher;
    this.idGenerator = arg6 as IdGenerator;
    this.dateTimeService = arg7 as DateTimeService;
  }

  public override async start(
    payload: ProductPublishingContext,
    correlationId?: string
  ): Promise<string> {
    this.lastContext = payload;
    this.completed = false;
    return super.start(payload, correlationId);
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
          const notificationsSent = await this.sendProductPublishedNotifications(context);

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
          this.completed = true;
        },
        compensate: async (context: ProductPublishingContext, sagaId: string) => {
          console.log(`[${sagaId}] Compensating success event`);
          this.completed = false;
        }
      }
    ];
  }

  public getState(): ProductPublishingContext {
    return this.lastContext ?? {
      productId: '',
      sellerId: '',
      autoPublish: false,
      notifyFollowers: false,
      updateSearchIndex: false,
      requestId: '',
      timestamp: new Date(),
      currentStep: 'initialized',
      productValidated: false,
      published: false,
      errors: [],
      retryCount: 0,
    };
  }

  public isCompleted(): boolean {
    return this.completed;
  }

  public async handleEvent(event: {
    eventType?: string;
    payload?: Record<string, unknown>;
  }): Promise<void> {
    const context = this.lastContext;
    if (!context) return;
    const eventProductId = typeof event.payload?.productId === 'string' ? event.payload.productId : '';
    if (eventProductId && eventProductId !== context.productId) return;

    if (event.eventType === 'ProductValidationFailed' || event.eventType === 'MediaProcessingFailed') {
      await this.compensate();
    }
  }

  public override async compensate(
    sagaId?: string,
    payload?: ProductPublishingContext,
    stepIndex?: number
  ): Promise<void> {
    this.completed = false;
    if (sagaId && payload && typeof stepIndex === 'number') {
      this.lastContext = payload;
      await super.compensate(sagaId, payload, stepIndex);
    }
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
    const imageConfig = {
      provider: ImageProcessingProvider.SHARP,
      maxFileSize: externalServicesConfig.image.maxSize,
      allowedFormats: externalServicesConfig.image.allowedFormats,
      quality: externalServicesConfig.image.quality,
      timeout: 30000,
      concurrency: 4,
      cacheEnabled: true
    };
    const imageProvider = new SharpImageProvider(imageConfig);

    for (const item of media) {
      let processedMetadata: Record<string, any> = {
        ...item.metadata,
        processed: true,
        processedAt: this.dateTimeService.now()
      };

      if (item.type === 'image' && item.buffer) {
        const thumbnail = await imageProvider.processImage(item.buffer, {
          width: 300,
          height: 300,
          fit: 'cover'
        });

        const resized = await imageProvider.processImage(item.buffer, {
          width: 1200,
          fit: 'inside'
        });

        processedMetadata = {
          ...processedMetadata,
          thumbnails: {
            small: { width: thumbnail.width, height: thumbnail.height, size: thumbnail.size }
          },
          resized: { width: resized.width, height: resized.height, size: resized.size }
        };
      }

      // Update processing status
      await this.mediaRepository.updateMetadata(item.id, {
        ...processedMetadata
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

  private async sendProductPublishedNotifications(context: ProductPublishingContext): Promise<string[]> {
    await eventBus.publish('ProductPublished', {
      productId: context.productId,
      sellerId: context.sellerId,
      publishedAt: this.dateTimeService.now(),
      autoPublished: context.autoPublish
    }, {
      correlationId: context.requestId
    });

    throw new Error('Notification delivery is not configured for product publishing.');
  }
}
