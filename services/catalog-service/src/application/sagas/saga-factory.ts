/**
 * Saga Factory
 * Provides factory methods for creating saga instances
 * Centralizes saga creation and dependency injection
 */

import { ProductPublishingSaga } from './product-publishing.saga';
import { BulkProductUpdateSaga } from './bulk-product-update.saga';
import {
  ProductRepository,
  CategoryRepository,
  MediaRepository,
  SearchService,
  DomainEventPublisher,
  IdGenerator,
  DateTimeService
} from '../../domain/interfaces';

/**
 * Saga Factory
 * Creates and configures saga instances with proper dependencies
 */
export class SagaFactory {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly mediaRepository: MediaRepository,
    private readonly searchService: SearchService,
    private readonly eventPublisher: DomainEventPublisher,
    private readonly idGenerator: IdGenerator,
    private readonly dateTimeService: DateTimeService
  ) {}

  /**
   * Create a product publishing saga
   */
  createProductPublishingSaga(context: {
    productId: string;
    sellerId: string;
    autoPublish: boolean;
    notifyFollowers: boolean;
    updateSearchIndex: boolean;
    requestId: string;
    timestamp: Date;
  }): ProductPublishingSaga {
    return new ProductPublishingSaga(
      this.productRepository,
      this.categoryRepository,
      this.mediaRepository,
      this.searchService,
      this.eventPublisher,
      this.idGenerator,
      this.dateTimeService,
      context
    );
  }

  /**
   * Create a bulk product update saga
   */
  createBulkProductUpdateSaga(context: {
    productIds: string[];
    updates: Record<string, any>;
    updateType: 'price' | 'status' | 'category' | 'attributes' | 'visibility';
    sellerId?: string;
    validateBusinessRules: boolean;
    requestId: string;
    timestamp: Date;
  }): BulkProductUpdateSaga {
    return new BulkProductUpdateSaga(
      this.productRepository,
      this.categoryRepository,
      this.eventPublisher,
      this.idGenerator,
      this.dateTimeService,
      context
    );
  }
}

/**
 * Saga Factory Factory
 * Creates saga factory instances
 */
export const createSagaFactory = (dependencies: {
  productRepository: ProductRepository;
  categoryRepository: CategoryRepository;
  mediaRepository: MediaRepository;
  searchService: SearchService;
  eventPublisher: DomainEventPublisher;
  idGenerator: IdGenerator;
  dateTimeService: DateTimeService;
}): SagaFactory => {
  return new SagaFactory(
    dependencies.productRepository,
    dependencies.categoryRepository,
    dependencies.mediaRepository,
    dependencies.searchService,
    dependencies.eventPublisher,
    dependencies.idGenerator,
    dependencies.dateTimeService
  );
};

/**
 * Saga Creation Helpers
 * Convenience functions for common saga creation patterns
 */
export class SagaCreationHelpers {
  constructor(private readonly sagaFactory: SagaFactory) {}

  /**
   * Create and start a product publishing saga
   */
  async createProductPublishingSaga(context: {
    productId: string;
    sellerId: string;
    autoPublish?: boolean;
    notifyFollowers?: boolean;
    updateSearchIndex?: boolean;
    requestId: string;
  }): Promise<ProductPublishingSaga> {
    const sagaContext = {
      productId: context.productId,
      sellerId: context.sellerId,
      autoPublish: context.autoPublish ?? true,
      notifyFollowers: context.notifyFollowers ?? true,
      updateSearchIndex: context.updateSearchIndex ?? true,
      requestId: context.requestId,
      timestamp: new Date()
    };

    const saga = this.sagaFactory.createProductPublishingSaga(sagaContext);

    // Start the saga
    await saga.start(sagaContext);

    return saga;
  }

  /**
   * Create and start a bulk product update saga
   */
  async createBulkProductUpdateSaga(context: {
    productIds: string[];
    updates: Record<string, any>;
    updateType: 'price' | 'status' | 'category' | 'attributes' | 'visibility';
    sellerId?: string;
    validateBusinessRules?: boolean;
    requestId: string;
  }): Promise<BulkProductUpdateSaga> {
    const sagaContext = {
      productIds: context.productIds,
      updates: context.updates,
      updateType: context.updateType,
      sellerId: context.sellerId,
      validateBusinessRules: context.validateBusinessRules ?? true,
      requestId: context.requestId,
      timestamp: new Date()
    };

    const saga = this.sagaFactory.createBulkProductUpdateSaga(sagaContext);

    // Start the saga
    await saga.start(sagaContext);

    return saga;
  }
}

/**
 * Saga Factory with Helpers
 * Combines factory and helper methods
 */
export class SagaFactoryWithHelpers extends SagaFactory {
  private readonly helpers: SagaCreationHelpers;

  constructor(
    productRepository: ProductRepository,
    categoryRepository: CategoryRepository,
    mediaRepository: MediaRepository,
    searchService: SearchService,
    eventPublisher: DomainEventPublisher,
    idGenerator: IdGenerator,
    dateTimeService: DateTimeService
  ) {
    super(
      productRepository,
      categoryRepository,
      mediaRepository,
      searchService,
      eventPublisher,
      idGenerator,
      dateTimeService
    );

    this.helpers = new SagaCreationHelpers(this);
  }

  /**
   * Get saga creation helpers
   */
  get creationHelpers(): SagaCreationHelpers {
    return this.helpers;
  }

  /**
   * Create and start a product publishing saga (convenience method)
   */
  async createAndStartProductPublishingSaga(context: {
    productId: string;
    sellerId: string;
    autoPublish?: boolean;
    notifyFollowers?: boolean;
    updateSearchIndex?: boolean;
    requestId: string;
  }): Promise<ProductPublishingSaga> {
    return this.helpers.createProductPublishingSaga(context);
  }

  /**
   * Create and start a bulk product update saga (convenience method)
   */
  async createAndStartBulkProductUpdateSaga(context: {
    productIds: string[];
    updates: Record<string, any>;
    updateType: 'price' | 'status' | 'category' | 'attributes' | 'visibility';
    sellerId?: string;
    validateBusinessRules?: boolean;
    requestId: string;
  }): Promise<BulkProductUpdateSaga> {
    return this.helpers.createBulkProductUpdateSaga(context);
  }
}

/**
 * Create Saga Factory with Helpers
 * Factory function for creating saga factory with helper methods
 */
export const createSagaFactoryWithHelpers = (dependencies: {
  productRepository: ProductRepository;
  categoryRepository: CategoryRepository;
  mediaRepository: MediaRepository;
  searchService: SearchService;
  eventPublisher: DomainEventPublisher;
  idGenerator: IdGenerator;
  dateTimeService: DateTimeService;
}): SagaFactoryWithHelpers => {
  return new SagaFactoryWithHelpers(
    dependencies.productRepository,
    dependencies.categoryRepository,
    dependencies.mediaRepository,
    dependencies.searchService,
    dependencies.eventPublisher,
    dependencies.idGenerator,
    dependencies.dateTimeService
  );
};
