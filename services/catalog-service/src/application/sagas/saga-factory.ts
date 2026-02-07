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
import { ISagaLogRepository } from '../../../../../shared/saga/saga.log';
import { SagaManager } from './saga-manager';

/**
 * Saga Factory
 * Creates and configures saga instances with proper dependencies
 */
export class SagaFactory {
  private productPublishingSaga: ProductPublishingSaga;
  private bulkProductUpdateSaga: BulkProductUpdateSaga;

  constructor(
    private readonly sagaLogRepository: ISagaLogRepository,
    private readonly productRepository: ProductRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly mediaRepository: MediaRepository,
    private readonly searchService: SearchService,
    private readonly eventPublisher: DomainEventPublisher,
    private readonly idGenerator: IdGenerator,
    private readonly dateTimeService: DateTimeService,
    private readonly serviceName: string = 'catalog-service'
  ) {
    // Instantiate orchestrators as singletons
    this.productPublishingSaga = new ProductPublishingSaga(
      this.sagaLogRepository,
      this.serviceName,
      this.productRepository,
      this.categoryRepository,
      this.mediaRepository,
      this.searchService,
      this.eventPublisher,
      this.idGenerator,
      this.dateTimeService
    );

    // BulkProductUpdateSaga refactored
    this.bulkProductUpdateSaga = new BulkProductUpdateSaga(
      this.sagaLogRepository,
      this.serviceName,
      this.productRepository,
      this.categoryRepository,
      this.eventPublisher,
      this.idGenerator,
      this.dateTimeService
    );
  }

  /**
   * Get product publishing saga orchestrator
   */
  getProductPublishingSaga(): ProductPublishingSaga {
    return this.productPublishingSaga;
  }

  /**
   * Get bulk product update saga orchestrator
   */
  getBulkProductUpdateSaga(): BulkProductUpdateSaga {
    return this.bulkProductUpdateSaga;
  }
}

/**
 * Saga Factory Factory
 * Creates saga factory instances
 */
export const createSagaFactory = (dependencies: {
  sagaLogRepository: ISagaLogRepository;
  productRepository: ProductRepository;
  categoryRepository: CategoryRepository;
  mediaRepository: MediaRepository;
  searchService: SearchService;
  eventPublisher: DomainEventPublisher;
  idGenerator: IdGenerator;
  dateTimeService: DateTimeService;
}): SagaFactory => {
  return new SagaFactory(
    dependencies.sagaLogRepository,
    dependencies.productRepository,
    dependencies.categoryRepository,
    dependencies.mediaRepository,
    dependencies.searchService,
    dependencies.eventPublisher,
    dependencies.idGenerator,
    dependencies.dateTimeService
  );
};

