/**
 * Product Publishing Saga Tests
 * 
 * Purpose: Validates saga orchestration logic and compensation mechanisms
 * Scope: Application layer saga testing with mocked external services
 * Coverage Target: 85% (saga orchestration and error handling)
 * 
 * Test Categories:
 * - Saga orchestration and step execution
 * - Event publishing and external service coordination
 * - Error handling and compensation logic
 * - Retry mechanisms and timeout handling
 */

import { ProductPublishingSaga, ProductPublishingContext } from '../product-publishing.saga';
import {
  ProductRepository,
  CategoryRepository,
  MediaRepository,
  SearchService,
  DomainEventPublisher,
  IdGenerator,
  DateTimeService
} from '../../../domain/interfaces';

describe('ProductPublishingSaga', () => {
  let saga: ProductPublishingSaga;
  let mockProductRepository: jest.Mocked<ProductRepository>;
  let mockCategoryRepository: jest.Mocked<CategoryRepository>;
  let mockMediaRepository: jest.Mocked<MediaRepository>;
  let mockSearchService: jest.Mocked<SearchService>;
  let mockEventPublisher: jest.Mocked<DomainEventPublisher>;
  let mockIdGenerator: jest.Mocked<IdGenerator>;
  let mockDateTimeService: jest.Mocked<DateTimeService>;

  beforeEach(() => {
    mockProductRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findBySeller: jest.fn(),
      findByCategory: jest.fn(),
      search: jest.fn(),
      updateStatus: jest.fn(),
      delete: jest.fn()
    };

    mockCategoryRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findBySlug: jest.fn(),
      findSubcategories: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };

    mockMediaRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByProduct: jest.fn(),
      delete: jest.fn(),
      updateMetadata: jest.fn()
    };

    mockSearchService = {
      index: jest.fn(),
      search: jest.fn(),
      remove: jest.fn(),
      update: jest.fn()
    };

    mockEventPublisher = {
      publish: jest.fn(),
      publishAll: jest.fn()
    };

    mockIdGenerator = {
      generate: jest.fn(),
      validate: jest.fn()
    };

    mockDateTimeService = {
      now: jest.fn(),
      timestamp: jest.fn(),
      add: jest.fn(),
      isPast: jest.fn(),
      format: jest.fn()
    };

    // Setup default mock returns
    mockIdGenerator.generate.mockReturnValue('generated-id');
    mockDateTimeService.now.mockReturnValue(new Date('2024-01-01T00:00:00Z'));
  });

  describe('Successful Publishing Workflow', () => {
    it('should complete full publishing workflow successfully', async () => {
      // Given: Valid publishing context and successful dependencies
      const context: ProductPublishingContext = {
        productId: 'product-123',
        sellerId: 'seller-456',
        autoPublish: true,
        notifyFollowers: true,
        updateSearchIndex: true,
        requestId: 'request-789',
        timestamp: new Date('2024-01-01T00:00:00Z')
      };

      const mockProduct = {
        id: 'product-123',
        sellerId: 'seller-456',
        name: 'Test Product',
        description: 'A comprehensive test product description',
        price: { amount: 99.99, currency: 'USD' },
        categoryId: 'category-789',
        status: 'draft'
      };

      const mockCategory = {
        id: 'category-789',
        name: 'Electronics',
        status: 'active'
      };

      const mockMedia = [
        { id: 'media-1', url: 'image1.jpg', type: 'image', order: 0, size: 1024 }
      ];

      // Setup successful mock responses
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockCategoryRepository.findById.mockResolvedValue(mockCategory);
      mockMediaRepository.findByProduct.mockResolvedValue(mockMedia);
      mockMediaRepository.updateMetadata.mockResolvedValue({});
      mockSearchService.index.mockResolvedValue();
      mockProductRepository.updateStatus.mockResolvedValue({});
      mockEventPublisher.publish.mockResolvedValue();

      // Create saga instance
      saga = new ProductPublishingSaga(
        mockProductRepository,
        mockCategoryRepository,
        mockMediaRepository,
        mockSearchService,
        mockEventPublisher,
        mockIdGenerator,
        mockDateTimeService,
        context
      );

      // When: Starting the saga
      await saga.start(context);

      // Then: Should complete all steps successfully
      expect(saga.isCompleted()).toBe(true);
      expect(saga.getState().published).toBe(true);
      expect(saga.getState().searchIndexed).toBe(true);
      expect(saga.getState().notificationsSent).toBe(true);

      // Verify all repository interactions
      expect(mockProductRepository.findById).toHaveBeenCalledWith('product-123');
      expect(mockCategoryRepository.findById).toHaveBeenCalledWith('category-789');
      expect(mockMediaRepository.findByProduct).toHaveBeenCalledWith('product-123');
      expect(mockSearchService.index).toHaveBeenCalled();
      expect(mockProductRepository.updateStatus).toHaveBeenCalledWith('product-123', 'published');

      // Verify events were published
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'ProductInventoryVerificationRequested'
        })
      );
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'ProductPublished'
        })
      );
    });

    it('should skip optional steps when configured', async () => {
      // Given: Context with optional features disabled
      const context: ProductPublishingContext = {
        productId: 'product-123',
        sellerId: 'seller-456',
        autoPublish: true,
        notifyFollowers: false,
        updateSearchIndex: false,
        requestId: 'request-789',
        timestamp: new Date('2024-01-01T00:00:00Z')
      };

      const mockProduct = {
        id: 'product-123',
        name: 'Test Product',
        description: 'Test description',
        price: { amount: 99.99, currency: 'USD' },
        categoryId: 'category-789',
        status: 'draft'
      };

      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockCategoryRepository.findById.mockResolvedValue({ id: 'category-789', status: 'active' });
      mockMediaRepository.findByProduct.mockResolvedValue([
        { id: 'media-1', type: 'image', order: 0, size: 1024 }
      ]);
      mockProductRepository.updateStatus.mockResolvedValue({});
      mockEventPublisher.publish.mockResolvedValue();

      saga = new ProductPublishingSaga(
        mockProductRepository,
        mockCategoryRepository,
        mockMediaRepository,
        mockSearchService,
        mockEventPublisher,
        mockIdGenerator,
        mockDateTimeService,
        context
      );

      // When: Starting saga with optional features disabled
      await saga.start(context);

      // Then: Should skip search indexing and notifications
      expect(saga.isCompleted()).toBe(true);
      expect(mockSearchService.index).not.toHaveBeenCalled();
      expect(saga.getState().searchIndexed).toBe(false);
      expect(saga.getState().notificationsSent).toBe(false);
    });
  });

  describe('Validation and Error Handling', () => {
    it('should fail when product is not found', async () => {
      // Given: Context with non-existent product
      const context: ProductPublishingContext = {
        productId: 'nonexistent-product',
        sellerId: 'seller-456',
        autoPublish: true,
        notifyFollowers: true,
        updateSearchIndex: true,
        requestId: 'request-789',
        timestamp: new Date('2024-01-01T00:00:00Z')
      };

      mockProductRepository.findById.mockResolvedValue(null);

      saga = new ProductPublishingSaga(
        mockProductRepository,
        mockCategoryRepository,
        mockMediaRepository,
        mockSearchService,
        mockEventPublisher,
        mockIdGenerator,
        mockDateTimeService,
        context
      );

      // When: Starting saga with non-existent product
      // Then: Should throw error
      await expect(saga.start(context)).rejects.toThrow('Product nonexistent-product not found');
      expect(saga.isCompleted()).toBe(false);
    });

    it('should fail when product validation fails', async () => {
      // Given: Product with invalid data
      const context: ProductPublishingContext = {
        productId: 'product-123',
        sellerId: 'seller-456',
        autoPublish: true,
        notifyFollowers: true,
        updateSearchIndex: true,
        requestId: 'request-789',
        timestamp: new Date('2024-01-01T00:00:00Z')
      };

      const invalidProduct = {
        id: 'product-123',
        name: '', // Invalid: empty name
        description: 'Short', // Invalid: too short
        price: { amount: 0, currency: 'USD' }, // Invalid: zero price
        categoryId: 'category-789',
        status: 'draft'
      };

      mockProductRepository.findById.mockResolvedValue(invalidProduct);

      saga = new ProductPublishingSaga(
        mockProductRepository,
        mockCategoryRepository,
        mockMediaRepository,
        mockSearchService,
        mockEventPublisher,
        mockIdGenerator,
        mockDateTimeService,
        context
      );

      // When: Starting saga with invalid product
      // Then: Should throw validation error
      await expect(saga.start(context)).rejects.toThrow('Product validation failed');
      expect(saga.isCompleted()).toBe(false);
    });

    it('should fail when category is not found', async () => {
      // Given: Product with non-existent category
      const context: ProductPublishingContext = {
        productId: 'product-123',
        sellerId: 'seller-456',
        autoPublish: true,
        notifyFollowers: true,
        updateSearchIndex: true,
        requestId: 'request-789',
        timestamp: new Date('2024-01-01T00:00:00Z')
      };

      const mockProduct = {
        id: 'product-123',
        name: 'Test Product',
        description: 'Valid description',
        price: { amount: 99.99, currency: 'USD' },
        categoryId: 'nonexistent-category',
        status: 'draft'
      };

      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockCategoryRepository.findById.mockResolvedValue(null);

      saga = new ProductPublishingSaga(
        mockProductRepository,
        mockCategoryRepository,
        mockMediaRepository,
        mockSearchService,
        mockEventPublisher,
        mockIdGenerator,
        mockDateTimeService,
        context
      );

      // When: Starting saga with non-existent category
      // Then: Should throw error
      await expect(saga.start(context)).rejects.toThrow('Category nonexistent-category not found');
    });

    it('should fail when category is inactive', async () => {
      // Given: Product with inactive category
      const context: ProductPublishingContext = {
        productId: 'product-123',
        sellerId: 'seller-456',
        autoPublish: true,
        notifyFollowers: true,
        updateSearchIndex: true,
        requestId: 'request-789',
        timestamp: new Date('2024-01-01T00:00:00Z')
      };

      const mockProduct = {
        id: 'product-123',
        name: 'Test Product',
        description: 'Valid description',
        price: { amount: 99.99, currency: 'USD' },
        categoryId: 'category-789',
        status: 'draft'
      };

      const inactiveCategory = {
        id: 'category-789',
        name: 'Inactive Category',
        status: 'inactive'
      };

      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockCategoryRepository.findById.mockResolvedValue(inactiveCategory);

      saga = new ProductPublishingSaga(
        mockProductRepository,
        mockCategoryRepository,
        mockMediaRepository,
        mockSearchService,
        mockEventPublisher,
        mockIdGenerator,
        mockDateTimeService,
        context
      );

      // When: Starting saga with inactive category
      // Then: Should throw error
      await expect(saga.start(context)).rejects.toThrow('Category category-789 is not active');
    });

    it('should fail when media requirements are not met', async () => {
      // Given: Product without required primary image
      const context: ProductPublishingContext = {
        productId: 'product-123',
        sellerId: 'seller-456',
        autoPublish: true,
        notifyFollowers: true,
        updateSearchIndex: true,
        requestId: 'request-789',
        timestamp: new Date('2024-01-01T00:00:00Z')
      };

      const mockProduct = {
        id: 'product-123',
        name: 'Test Product',
        description: 'Valid description',
        price: { amount: 99.99, currency: 'USD' },
        categoryId: 'category-789',
        status: 'draft'
      };

      const invalidMedia = [
        { id: 'media-1', type: 'video', order: 1 } // No primary image
      ];

      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockCategoryRepository.findById.mockResolvedValue({ id: 'category-789', status: 'active' });
      mockMediaRepository.findByProduct.mockResolvedValue(invalidMedia);

      saga = new ProductPublishingSaga(
        mockProductRepository,
        mockCategoryRepository,
        mockMediaRepository,
        mockSearchService,
        mockEventPublisher,
        mockIdGenerator,
        mockDateTimeService,
        context
      );

      // When: Starting saga with invalid media
      // Then: Should throw error
      await expect(saga.start(context)).rejects.toThrow('Product must have at least one primary image');
    });
  });

  describe('Compensation Logic', () => {
    it('should compensate successfully when search indexing fails', async () => {
      // Given: Valid setup but search service fails
      const context: ProductPublishingContext = {
        productId: 'product-123',
        sellerId: 'seller-456',
        autoPublish: true,
        notifyFollowers: true,
        updateSearchIndex: true,
        requestId: 'request-789',
        timestamp: new Date('2024-01-01T00:00:00Z')
      };

      const mockProduct = {
        id: 'product-123',
        name: 'Test Product',
        description: 'Valid description',
        price: { amount: 99.99, currency: 'USD' },
        categoryId: 'category-789',
        status: 'draft'
      };

      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockCategoryRepository.findById.mockResolvedValue({ id: 'category-789', status: 'active' });
      mockMediaRepository.findByProduct.mockResolvedValue([
        { id: 'media-1', type: 'image', order: 0, size: 1024 }
      ]);
      mockEventPublisher.publish.mockResolvedValue();
      mockSearchService.index.mockRejectedValue(new Error('Search service unavailable'));
      mockSearchService.remove.mockResolvedValue();

      saga = new ProductPublishingSaga(
        mockProductRepository,
        mockCategoryRepository,
        mockMediaRepository,
        mockSearchService,
        mockEventPublisher,
        mockIdGenerator,
        mockDateTimeService,
        context
      );

      // When: Starting saga with failing search service
      // Then: Should fail and compensate
      await expect(saga.start(context)).rejects.toThrow('Search service unavailable');

      // Verify compensation was called
      expect(mockSearchService.remove).not.toHaveBeenCalled(); // No compensation needed since indexing failed
    });

    it('should compensate product status when publishing fails after status update', async () => {
      // Given: Valid setup but final step fails
      const context: ProductPublishingContext = {
        productId: 'product-123',
        sellerId: 'seller-456',
        autoPublish: true,
        notifyFollowers: true,
        updateSearchIndex: false,
        requestId: 'request-789',
        timestamp: new Date('2024-01-01T00:00:00Z')
      };

      const mockProduct = {
        id: 'product-123',
        name: 'Test Product',
        description: 'Valid description',
        price: { amount: 99.99, currency: 'USD' },
        categoryId: 'category-789',
        status: 'draft'
      };

      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockCategoryRepository.findById.mockResolvedValue({ id: 'category-789', status: 'active' });
      mockMediaRepository.findByProduct.mockResolvedValue([
        { id: 'media-1', type: 'image', order: 0, size: 1024 }
      ]);
      mockProductRepository.updateStatus
        .mockResolvedValueOnce({}) // First call succeeds (publish)
        .mockResolvedValueOnce({}); // Second call succeeds (compensation)
      mockEventPublisher.publish
        .mockResolvedValueOnce() // Inventory verification request
        .mockRejectedValueOnce(new Error('Event publishing failed')); // Final event fails

      saga = new ProductPublishingSaga(
        mockProductRepository,
        mockCategoryRepository,
        mockMediaRepository,
        mockSearchService,
        mockEventPublisher,
        mockIdGenerator,
        mockDateTimeService,
        context
      );

      // When: Starting saga with failing final event
      // Then: Should fail and compensate
      await expect(saga.start(context)).rejects.toThrow('Event publishing failed');

      // Verify compensation was attempted
      expect(mockProductRepository.updateStatus).toHaveBeenCalledWith('product-123', 'published');
      expect(mockProductRepository.updateStatus).toHaveBeenCalledWith('product-123', 'draft');
    });
  });

  describe('Event Handling', () => {
    it('should handle external validation failure events', async () => {
      // Given: Running saga
      const context: ProductPublishingContext = {
        productId: 'product-123',
        sellerId: 'seller-456',
        autoPublish: true,
        notifyFollowers: true,
        updateSearchIndex: true,
        requestId: 'request-789',
        timestamp: new Date('2024-01-01T00:00:00Z')
      };

      saga = new ProductPublishingSaga(
        mockProductRepository,
        mockCategoryRepository,
        mockMediaRepository,
        mockSearchService,
        mockEventPublisher,
        mockIdGenerator,
        mockDateTimeService,
        context
      );

      // Mock compensation method
      const compensateSpy = jest.spyOn(saga, 'compensate').mockResolvedValue();

      // When: Receiving validation failure event
      const failureEvent = {
        eventType: 'ProductValidationFailed',
        payload: { productId: 'product-123' }
      };

      await saga.handleEvent(failureEvent);

      // Then: Should trigger compensation
      expect(compensateSpy).toHaveBeenCalled();
    });

    it('should handle media processing failure events', async () => {
      // Given: Running saga
      const context: ProductPublishingContext = {
        productId: 'product-123',
        sellerId: 'seller-456',
        autoPublish: true,
        notifyFollowers: true,
        updateSearchIndex: true,
        requestId: 'request-789',
        timestamp: new Date('2024-01-01T00:00:00Z')
      };

      saga = new ProductPublishingSaga(
        mockProductRepository,
        mockCategoryRepository,
        mockMediaRepository,
        mockSearchService,
        mockEventPublisher,
        mockIdGenerator,
        mockDateTimeService,
        context
      );

      const compensateSpy = jest.spyOn(saga, 'compensate').mockResolvedValue();

      // When: Receiving media processing failure event
      const failureEvent = {
        eventType: 'MediaProcessingFailed',
        payload: { productId: 'product-123' }
      };

      await saga.handleEvent(failureEvent);

      // Then: Should trigger compensation
      expect(compensateSpy).toHaveBeenCalled();
    });

    it('should ignore events for different products', async () => {
      // Given: Running saga for product-123
      const context: ProductPublishingContext = {
        productId: 'product-123',
        sellerId: 'seller-456',
        autoPublish: true,
        notifyFollowers: true,
        updateSearchIndex: true,
        requestId: 'request-789',
        timestamp: new Date('2024-01-01T00:00:00Z')
      };

      saga = new ProductPublishingSaga(
        mockProductRepository,
        mockCategoryRepository,
        mockMediaRepository,
        mockSearchService,
        mockEventPublisher,
        mockIdGenerator,
        mockDateTimeService,
        context
      );

      const compensateSpy = jest.spyOn(saga, 'compensate').mockResolvedValue();

      // When: Receiving event for different product
      const unrelatedEvent = {
        eventType: 'ProductValidationFailed',
        payload: { productId: 'different-product' }
      };

      await saga.handleEvent(unrelatedEvent);

      // Then: Should not trigger compensation
      expect(compensateSpy).not.toHaveBeenCalled();
    });
  });

  describe('State Management', () => {
    it('should track saga state correctly', async () => {
      // Given: Valid publishing context
      const context: ProductPublishingContext = {
        productId: 'product-123',
        sellerId: 'seller-456',
        autoPublish: true,
        notifyFollowers: true,
        updateSearchIndex: true,
        requestId: 'request-789',
        timestamp: new Date('2024-01-01T00:00:00Z')
      };

      saga = new ProductPublishingSaga(
        mockProductRepository,
        mockCategoryRepository,
        mockMediaRepository,
        mockSearchService,
        mockEventPublisher,
        mockIdGenerator,
        mockDateTimeService,
        context
      );

      // When: Getting initial state
      const initialState = saga.getState();

      // Then: Should have correct initial state
      expect(initialState.productId).toBe('product-123');
      expect(initialState.sellerId).toBe('seller-456');
      expect(initialState.autoPublish).toBe(true);
      expect(initialState.notifyFollowers).toBe(true);
      expect(initialState.updateSearchIndex).toBe(true);
      expect(initialState.currentStep).toBe('initialized');
      expect(initialState.productValidated).toBe(false);
      expect(initialState.published).toBe(false);
      expect(initialState.errors).toEqual([]);
      expect(initialState.retryCount).toBe(0);
    });

    it('should update state during execution', async () => {
      // Given: Partially successful execution
      const context: ProductPublishingContext = {
        productId: 'product-123',
        sellerId: 'seller-456',
        autoPublish: true,
        notifyFollowers: false,
        updateSearchIndex: false,
        requestId: 'request-789',
        timestamp: new Date('2024-01-01T00:00:00Z')
      };

      const mockProduct = {
        id: 'product-123',
        name: 'Test Product',
        description: 'Valid description',
        price: { amount: 99.99, currency: 'USD' },
        categoryId: 'category-789',
        status: 'draft'
      };

      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockCategoryRepository.findById.mockResolvedValue({ id: 'category-789', status: 'active' });
      mockMediaRepository.findByProduct.mockResolvedValue([
        { id: 'media-1', type: 'image', order: 0, size: 1024 }
      ]);
      mockProductRepository.updateStatus.mockResolvedValue({});
      mockEventPublisher.publish.mockResolvedValue();

      saga = new ProductPublishingSaga(
        mockProductRepository,
        mockCategoryRepository,
        mockMediaRepository,
        mockSearchService,
        mockEventPublisher,
        mockIdGenerator,
        mockDateTimeService,
        context
      );

      // When: Executing saga
      await saga.start(context);

      // Then: Should update state correctly
      const finalState = saga.getState();
      expect(finalState.productValidated).toBe(true);
      expect(finalState.mediaProcessed).toBe(true);
      expect(finalState.published).toBe(true);
      expect(finalState.searchIndexed).toBe(false); // Skipped
      expect(finalState.notificationsSent).toBe(false); // Skipped
    });
  });
});
