/**
 * Bulk Product Update Saga Tests
 * 
 * Purpose: Validates bulk update orchestration and atomicity
 * Scope: Application layer saga testing with mocked external services
 * Coverage Target: 85% (saga orchestration and compensation)
 * 
 * Test Categories:
 * - Bulk update orchestration and validation
 * - Update type-specific logic and validation
 * - Compensation and rollback mechanisms
 * - Event handling and external coordination
 */

import { BulkProductUpdateSaga, BulkProductUpdateContext } from '../bulk-product-update.saga';
import {
  ProductRepository,
  CategoryRepository,
  DomainEventPublisher,
  IdGenerator,
  DateTimeService
} from '../../../domain/interfaces';

describe('BulkProductUpdateSaga', () => {
  let saga: BulkProductUpdateSaga;
  let mockProductRepository: jest.Mocked<ProductRepository>;
  let mockCategoryRepository: jest.Mocked<CategoryRepository>;
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

  describe('Successful Bulk Updates', () => {
    it('should complete bulk status update successfully', async () => {
      // Given: Valid bulk status update context
      const context: BulkProductUpdateContext = {
        productIds: ['product-1', 'product-2', 'product-3'],
        updates: { status: 'published' },
        updateType: 'status',
        sellerId: 'seller-123',
        validateBusinessRules: true,
        requestId: 'request-789',
        timestamp: new Date('2024-01-01T00:00:00Z')
      };

      const mockProducts = [
        { id: 'product-1', sellerId: 'seller-123', status: 'draft' },
        { id: 'product-2', sellerId: 'seller-123', status: 'draft' },
        { id: 'product-3', sellerId: 'seller-123', status: 'draft' }
      ];

      // Setup successful mock responses
      mockProductRepository.findById
        .mockResolvedValueOnce(mockProducts[0])
        .mockResolvedValueOnce(mockProducts[1])
        .mockResolvedValueOnce(mockProducts[2])
        .mockResolvedValueOnce(mockProducts[0]) // For update application
        .mockResolvedValueOnce(mockProducts[1])
        .mockResolvedValueOnce(mockProducts[2]);

      mockProductRepository.save.mockResolvedValue({});
      mockEventPublisher.publish.mockResolvedValue();

      saga = new BulkProductUpdateSaga(
        mockProductRepository,
        mockCategoryRepository,
        mockEventPublisher,
        mockIdGenerator,
        mockDateTimeService,
        context
      );

      // When: Starting the bulk update saga
      await saga.start(context);

      // Then: Should complete successfully
      expect(saga.isCompleted()).toBe(true);
      const results = saga.getResults();
      expect(results.successful).toEqual(['product-1', 'product-2', 'product-3']);
      expect(results.totalSuccessful).toBe(3);
      expect(results.totalFailed).toBe(0);

      // Verify all products were updated
      expect(mockProductRepository.save).toHaveBeenCalledTimes(3);
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'BulkProductUpdateCompleted'
        })
      );
    });

    it('should complete bulk category update successfully', async () => {
      // Given: Valid bulk category update context
      const context: BulkProductUpdateContext = {
        productIds: ['product-1', 'product-2'],
        updates: { categoryId: 'new-category-123' },
        updateType: 'category',
        validateBusinessRules: true,
        requestId: 'request-789',
        timestamp: new Date('2024-01-01T00:00:00Z')
      };

      const mockProducts = [
        { id: 'product-1', categoryId: 'old-category' },
        { id: 'product-2', categoryId: 'old-category' }
      ];

      const mockCategory = {
        id: 'new-category-123',
        name: 'New Category',
        status: 'active'
      };

      mockProductRepository.findById
        .mockResolvedValueOnce(mockProducts[0])
        .mockResolvedValueOnce(mockProducts[1])
        .mockResolvedValueOnce(mockProducts[0])
        .mockResolvedValueOnce(mockProducts[1]);

      mockCategoryRepository.findById.mockResolvedValue(mockCategory);
      mockProductRepository.save.mockResolvedValue({});
      mockEventPublisher.publish.mockResolvedValue();

      saga = new BulkProductUpdateSaga(
        mockProductRepository,
        mockCategoryRepository,
        mockEventPublisher,
        mockIdGenerator,
        mockDateTimeService,
        context
      );

      // When: Starting category update saga
      await saga.start(context);

      // Then: Should complete successfully
      expect(saga.isCompleted()).toBe(true);
      const results = saga.getResults();
      expect(results.successful).toEqual(['product-1', 'product-2']);

      // Verify category validation was called
      expect(mockCategoryRepository.findById).toHaveBeenCalledWith('new-category-123');
      expect(mockProductRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          categoryId: 'new-category-123'
        })
      );
    });

    it('should complete bulk price update successfully', async () => {
      // Given: Valid bulk price update context
      const context: BulkProductUpdateContext = {
        productIds: ['product-1'],
        updates: { price: { amount: 150, currency: 'USD' } },
        updateType: 'price',
        validateBusinessRules: true,
        requestId: 'request-789',
        timestamp: new Date('2024-01-01T00:00:00Z')
      };

      const mockProduct = {
        id: 'product-1',
        price: { amount: 100, currency: 'USD' }
      };

      mockProductRepository.findById
        .mockResolvedValueOnce(mockProduct)
        .mockResolvedValueOnce(mockProduct);

      mockProductRepository.save.mockResolvedValue({});
      mockEventPublisher.publish.mockResolvedValue();

      saga = new BulkProductUpdateSaga(
        mockProductRepository,
        mockCategoryRepository,
        mockEventPublisher,
        mockIdGenerator,
        mockDateTimeService,
        context
      );

      // When: Starting price update saga
      await saga.start(context);

      // Then: Should complete successfully
      expect(saga.isCompleted()).toBe(true);
      expect(mockProductRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          price: { amount: 150, currency: 'USD' }
        })
      );
    });
  });

  describe('Validation and Access Control', () => {
    it('should skip products not found', async () => {
      // Given: Context with non-existent products
      const context: BulkProductUpdateContext = {
        productIds: ['product-1', 'nonexistent-product', 'product-3'],
        updates: { status: 'published' },
        updateType: 'status',
        validateBusinessRules: false,
        requestId: 'request-789',
        timestamp: new Date('2024-01-01T00:00:00Z')
      };

      mockProductRepository.findById
        .mockResolvedValueOnce({ id: 'product-1', status: 'draft' })
        .mockResolvedValueOnce(null) // Non-existent product
        .mockResolvedValueOnce({ id: 'product-3', status: 'draft' })
        .mockResolvedValueOnce({ id: 'product-1', status: 'draft' })
        .mockResolvedValueOnce({ id: 'product-3', status: 'draft' });

      mockProductRepository.save.mockResolvedValue({});
      mockEventPublisher.publish.mockResolvedValue();

      saga = new BulkProductUpdateSaga(
        mockProductRepository,
        mockCategoryRepository,
        mockEventPublisher,
        mockIdGenerator,
        mockDateTimeService,
        context
      );

      // When: Starting saga with mixed valid/invalid products
      await saga.start(context);

      // Then: Should skip non-existent product and process valid ones
      const results = saga.getResults();
      expect(results.successful).toEqual(['product-1', 'product-3']);
      expect(results.skipped).toContainEqual({
        productId: 'nonexistent-product',
        reason: 'Product not found'
      });
      expect(results.totalSuccessful).toBe(2);
    });

    it('should enforce seller permission when specified', async () => {
      // Given: Context with seller restriction
      const context: BulkProductUpdateContext = {
        productIds: ['product-1', 'product-2'],
        updates: { status: 'published' },
        updateType: 'status',
        sellerId: 'seller-123',
        validateBusinessRules: false,
        requestId: 'request-789',
        timestamp: new Date('2024-01-01T00:00:00Z')
      };

      mockProductRepository.findById
        .mockResolvedValueOnce({ id: 'product-1', sellerId: 'seller-123', status: 'draft' })
        .mockResolvedValueOnce({ id: 'product-2', sellerId: 'different-seller', status: 'draft' })
        .mockResolvedValueOnce({ id: 'product-1', sellerId: 'seller-123', status: 'draft' });

      mockProductRepository.save.mockResolvedValue({});
      mockEventPublisher.publish.mockResolvedValue();

      saga = new BulkProductUpdateSaga(
        mockProductRepository,
        mockCategoryRepository,
        mockEventPublisher,
        mockIdGenerator,
        mockDateTimeService,
        context
      );

      // When: Starting saga with seller restriction
      await saga.start(context);

      // Then: Should skip unauthorized product
      const results = saga.getResults();
      expect(results.successful).toEqual(['product-1']);
      expect(results.skipped).toContainEqual({
        productId: 'product-2',
        reason: 'Access denied'
      });
    });
  });

  describe('Update Type Validation', () => {
    it('should validate price updates correctly', async () => {
      // Given: Context with invalid price update
      const context: BulkProductUpdateContext = {
        productIds: ['product-1'],
        updates: { price: { amount: -10, currency: 'USD' } }, // Invalid negative price
        updateType: 'price',
        validateBusinessRules: true,
        requestId: 'request-789',
        timestamp: new Date('2024-01-01T00:00:00Z')
      };

      mockProductRepository.findById.mockResolvedValue({
        id: 'product-1',
        price: { amount: 100, currency: 'USD' }
      });

      saga = new BulkProductUpdateSaga(
        mockProductRepository,
        mockCategoryRepository,
        mockEventPublisher,
        mockIdGenerator,
        mockDateTimeService,
        context
      );

      // When: Starting saga with invalid price
      // Then: Should fail validation
      await expect(saga.start(context)).rejects.toThrow('No valid updates to apply');

      const results = saga.getResults();
      expect(results.failed).toHaveLength(1);
      expect(results.failed[0].error).toContain('Invalid price specified');
    });

    it('should validate excessive price changes', async () => {
      // Given: Context with excessive price change
      const context: BulkProductUpdateContext = {
        productIds: ['product-1'],
        updates: { price: { amount: 200, currency: 'USD' } }, // 100% increase
        updateType: 'price',
        validateBusinessRules: true,
        requestId: 'request-789',
        timestamp: new Date('2024-01-01T00:00:00Z')
      };

      mockProductRepository.findById.mockResolvedValue({
        id: 'product-1',
        price: { amount: 100, currency: 'USD' }
      });

      saga = new BulkProductUpdateSaga(
        mockProductRepository,
        mockCategoryRepository,
        mockEventPublisher,
        mockIdGenerator,
        mockDateTimeService,
        context
      );

      // When: Starting saga with excessive price change
      // Then: Should fail business rule validation
      await expect(saga.start(context)).rejects.toThrow('No valid updates to apply');

      const results = saga.getResults();
      expect(results.failed).toHaveLength(1);
      expect(results.failed[0].error).toContain('exceeds 50% limit');
    });

    it('should validate status transitions', async () => {
      // Given: Context with invalid status transition
      const context: BulkProductUpdateContext = {
        productIds: ['product-1'],
        updates: { status: 'published' },
        updateType: 'status',
        validateBusinessRules: true,
        requestId: 'request-789',
        timestamp: new Date('2024-01-01T00:00:00Z')
      };

      mockProductRepository.findById.mockResolvedValue({
        id: 'product-1',
        status: 'archived' // Cannot change from archived
      });

      saga = new BulkProductUpdateSaga(
        mockProductRepository,
        mockCategoryRepository,
        mockEventPublisher,
        mockIdGenerator,
        mockDateTimeService,
        context
      );

      // When: Starting saga with invalid status transition
      // Then: Should fail validation
      await expect(saga.start(context)).rejects.toThrow('No valid updates to apply');

      const results = saga.getResults();
      expect(results.failed).toHaveLength(1);
      expect(results.failed[0].error).toContain('Cannot change status of archived products');
    });

    it('should validate category updates', async () => {
      // Given: Context with non-existent category
      const context: BulkProductUpdateContext = {
        productIds: ['product-1'],
        updates: { categoryId: 'nonexistent-category' },
        updateType: 'category',
        validateBusinessRules: true,
        requestId: 'request-789',
        timestamp: new Date('2024-01-01T00:00:00Z')
      };

      mockProductRepository.findById.mockResolvedValue({
        id: 'product-1',
        categoryId: 'old-category'
      });

      mockCategoryRepository.findById.mockResolvedValue(null);

      saga = new BulkProductUpdateSaga(
        mockProductRepository,
        mockCategoryRepository,
        mockEventPublisher,
        mockIdGenerator,
        mockDateTimeService,
        context
      );

      // When: Starting saga with non-existent category
      // Then: Should fail validation
      await expect(saga.start(context)).rejects.toThrow('No valid updates to apply');

      const results = saga.getResults();
      expect(results.failed).toHaveLength(1);
      expect(results.failed[0].error).toContain('Category not found');
    });

    it('should validate inactive category updates', async () => {
      // Given: Context with inactive category
      const context: BulkProductUpdateContext = {
        productIds: ['product-1'],
        updates: { categoryId: 'inactive-category' },
        updateType: 'category',
        validateBusinessRules: true,
        requestId: 'request-789',
        timestamp: new Date('2024-01-01T00:00:00Z')
      };

      mockProductRepository.findById.mockResolvedValue({
        id: 'product-1',
        categoryId: 'old-category'
      });

      mockCategoryRepository.findById.mockResolvedValue({
        id: 'inactive-category',
        status: 'inactive'
      });

      saga = new BulkProductUpdateSaga(
        mockProductRepository,
        mockCategoryRepository,
        mockEventPublisher,
        mockIdGenerator,
        mockDateTimeService,
        context
      );

      // When: Starting saga with inactive category
      // Then: Should fail validation
      await expect(saga.start(context)).rejects.toThrow('No valid updates to apply');

      const results = saga.getResults();
      expect(results.failed).toHaveLength(1);
      expect(results.failed[0].error).toContain('Category is not active');
    });
  });

  describe('Compensation and Rollback', () => {
    it('should rollback successful updates when later step fails', async () => {
      // Given: Context where updates succeed but notifications fail
      const context: BulkProductUpdateContext = {
        productIds: ['product-1', 'product-2'],
        updates: { status: 'published' },
        updateType: 'status',
        validateBusinessRules: false,
        requestId: 'request-789',
        timestamp: new Date('2024-01-01T00:00:00Z')
      };

      const mockProducts = [
        { id: 'product-1', status: 'draft' },
        { id: 'product-2', status: 'draft' }
      ];

      mockProductRepository.findById
        .mockResolvedValueOnce(mockProducts[0])
        .mockResolvedValueOnce(mockProducts[1])
        .mockResolvedValueOnce(mockProducts[0]) // For update application
        .mockResolvedValueOnce(mockProducts[1]);

      mockProductRepository.save
        .mockResolvedValueOnce({}) // First update succeeds
        .mockResolvedValueOnce({}) // Second update succeeds
        .mockResolvedValueOnce({}) // First rollback succeeds
        .mockResolvedValueOnce({}); // Second rollback succeeds

      mockEventPublisher.publish
        .mockResolvedValueOnce() // First event succeeds
        .mockRejectedValueOnce(new Error('Notification service unavailable')); // Second event fails

      saga = new BulkProductUpdateSaga(
        mockProductRepository,
        mockCategoryRepository,
        mockEventPublisher,
        mockIdGenerator,
        mockDateTimeService,
        context
      );

      // When: Starting saga with failing notification step
      // Then: Should fail and rollback
      await expect(saga.start(context)).rejects.toThrow('Notification service unavailable');

      // Verify rollback was performed
      expect(mockProductRepository.save).toHaveBeenCalledTimes(4); // 2 updates + 2 rollbacks
    });

    it('should handle rollback failures gracefully', async () => {
      // Given: Context where rollback fails
      const context: BulkProductUpdateContext = {
        productIds: ['product-1'],
        updates: { status: 'published' },
        updateType: 'status',
        validateBusinessRules: false,
        requestId: 'request-789',
        timestamp: new Date('2024-01-01T00:00:00Z')
      };

      const mockProduct = { id: 'product-1', status: 'draft' };

      mockProductRepository.findById
        .mockResolvedValueOnce(mockProduct)
        .mockResolvedValueOnce(mockProduct);

      mockProductRepository.save
        .mockResolvedValueOnce({}) // Update succeeds
        .mockRejectedValueOnce(new Error('Rollback failed')); // Rollback fails

      mockEventPublisher.publish
        .mockResolvedValueOnce() // First event succeeds
        .mockRejectedValueOnce(new Error('Notification failed')); // Notification fails

      saga = new BulkProductUpdateSaga(
        mockProductRepository,
        mockCategoryRepository,
        mockEventPublisher,
        mockIdGenerator,
        mockDateTimeService,
        context
      );

      // When: Starting saga with failing rollback
      // Then: Should handle rollback failure gracefully
      await expect(saga.start(context)).rejects.toThrow('Notification failed');

      // Verify rollback was attempted despite failure
      expect(mockProductRepository.save).toHaveBeenCalledTimes(2);
    });
  });

  describe('Event Handling', () => {
    it('should handle product deletion events', async () => {
      // Given: Running saga
      const context: BulkProductUpdateContext = {
        productIds: ['product-1', 'product-2'],
        updates: { status: 'published' },
        updateType: 'status',
        validateBusinessRules: false,
        requestId: 'request-789',
        timestamp: new Date('2024-01-01T00:00:00Z')
      };

      saga = new BulkProductUpdateSaga(
        mockProductRepository,
        mockCategoryRepository,
        mockEventPublisher,
        mockIdGenerator,
        mockDateTimeService,
        context
      );

      // When: Receiving product deletion event
      const deletionEvent = {
        eventType: 'ProductDeleted',
        payload: { productId: 'product-1' }
      };

      await saga.handleEvent(deletionEvent);

      // Then: Should remove deleted product from processing
      const state = saga.getState();
      expect(state.productIds).not.toContain('product-1');
      expect(state.productIds).toContain('product-2');
    });

    it('should handle category deactivation events', async () => {
      // Given: Running saga with category update
      const context: BulkProductUpdateContext = {
        productIds: ['product-1'],
        updates: { categoryId: 'category-123' },
        updateType: 'category',
        validateBusinessRules: false,
        requestId: 'request-789',
        timestamp: new Date('2024-01-01T00:00:00Z')
      };

      saga = new BulkProductUpdateSaga(
        mockProductRepository,
        mockCategoryRepository,
        mockEventPublisher,
        mockIdGenerator,
        mockDateTimeService,
        context
      );

      // Mock compensation method
      const compensateSpy = jest.spyOn(saga, 'compensate').mockResolvedValue();

      // When: Receiving category deactivation event for target category
      const deactivationEvent = {
        eventType: 'CategoryDeactivated',
        payload: { categoryId: 'category-123' }
      };

      await saga.handleEvent(deactivationEvent);

      // Then: Should trigger compensation
      expect(compensateSpy).toHaveBeenCalled();
    });

    it('should ignore unrelated events', async () => {
      // Given: Running saga
      const context: BulkProductUpdateContext = {
        productIds: ['product-1'],
        updates: { status: 'published' },
        updateType: 'status',
        validateBusinessRules: false,
        requestId: 'request-789',
        timestamp: new Date('2024-01-01T00:00:00Z')
      };

      saga = new BulkProductUpdateSaga(
        mockProductRepository,
        mockCategoryRepository,
        mockEventPublisher,
        mockIdGenerator,
        mockDateTimeService,
        context
      );

      const compensateSpy = jest.spyOn(saga, 'compensate').mockResolvedValue();

      // When: Receiving unrelated event
      const unrelatedEvent = {
        eventType: 'UnrelatedEvent',
        payload: { someData: 'value' }
      };

      await saga.handleEvent(unrelatedEvent);

      // Then: Should not trigger compensation
      expect(compensateSpy).not.toHaveBeenCalled();
    });
  });

  describe('Partial Success Handling', () => {
    it('should continue with partial success when some updates fail', async () => {
      // Given: Context where some products fail during update
      const context: BulkProductUpdateContext = {
        productIds: ['product-1', 'product-2', 'product-3'],
        updates: { status: 'published' },
        updateType: 'status',
        validateBusinessRules: false,
        requestId: 'request-789',
        timestamp: new Date('2024-01-01T00:00:00Z')
      };

      mockProductRepository.findById
        .mockResolvedValueOnce({ id: 'product-1', status: 'draft' })
        .mockResolvedValueOnce({ id: 'product-2', status: 'draft' })
        .mockResolvedValueOnce({ id: 'product-3', status: 'draft' })
        .mockResolvedValueOnce({ id: 'product-1', status: 'draft' })
        .mockRejectedValueOnce(new Error('Product not found')) // product-2 fails during update
        .mockResolvedValueOnce({ id: 'product-3', status: 'draft' });

      mockProductRepository.save.mockResolvedValue({});
      mockEventPublisher.publish.mockResolvedValue();

      saga = new BulkProductUpdateSaga(
        mockProductRepository,
        mockCategoryRepository,
        mockEventPublisher,
        mockIdGenerator,
        mockDateTimeService,
        context
      );

      // When: Starting saga with partial failures
      await saga.start(context);

      // Then: Should complete with partial success
      expect(saga.isCompleted()).toBe(true);
      const results = saga.getResults();
      expect(results.successful).toEqual(['product-1', 'product-3']);
      expect(results.failed).toHaveLength(1);
      expect(results.failed[0].productId).toBe('product-2');
      expect(results.totalSuccessful).toBe(2);
      expect(results.totalFailed).toBe(1);
    });
  });

  describe('Results and State Management', () => {
    it('should provide comprehensive results', async () => {
      // Given: Mixed success/failure scenario
      const context: BulkProductUpdateContext = {
        productIds: ['product-1', 'nonexistent', 'product-3'],
        updates: { status: 'published' },
        updateType: 'status',
        validateBusinessRules: false,
        requestId: 'request-789',
        timestamp: new Date('2024-01-01T00:00:00Z')
      };

      mockProductRepository.findById
        .mockResolvedValueOnce({ id: 'product-1', status: 'draft' })
        .mockResolvedValueOnce(null) // nonexistent
        .mockResolvedValueOnce({ id: 'product-3', status: 'draft' })
        .mockResolvedValueOnce({ id: 'product-1', status: 'draft' })
        .mockResolvedValueOnce({ id: 'product-3', status: 'draft' });

      mockProductRepository.save.mockResolvedValue({});
      mockEventPublisher.publish.mockResolvedValue();

      saga = new BulkProductUpdateSaga(
        mockProductRepository,
        mockCategoryRepository,
        mockEventPublisher,
        mockIdGenerator,
        mockDateTimeService,
        context
      );

      // When: Executing mixed scenario
      await saga.start(context);

      // Then: Should provide comprehensive results
      const results = saga.getResults();
      expect(results.totalProcessed).toBe(2); // Only valid products processed
      expect(results.totalSuccessful).toBe(2);
      expect(results.totalFailed).toBe(0);
      expect(results.successful).toEqual(['product-1', 'product-3']);
      expect(results.skipped).toHaveLength(1);
      expect(results.skipped[0].productId).toBe('nonexistent');
    });

    it('should track saga state correctly', async () => {
      // Given: Valid bulk update context
      const context: BulkProductUpdateContext = {
        productIds: ['product-1', 'product-2'],
        updates: { status: 'published' },
        updateType: 'status',
        validateBusinessRules: true,
        requestId: 'request-789',
        timestamp: new Date('2024-01-01T00:00:00Z')
      };

      saga = new BulkProductUpdateSaga(
        mockProductRepository,
        mockCategoryRepository,
        mockEventPublisher,
        mockIdGenerator,
        mockDateTimeService,
        context
      );

      // When: Getting initial state
      const initialState = saga.getState();

      // Then: Should have correct initial state
      expect(initialState.productIds).toEqual(['product-1', 'product-2']);
      expect(initialState.updates).toEqual({ status: 'published' });
      expect(initialState.updateType).toBe('status');
      expect(initialState.validateBusinessRules).toBe(true);
      expect(initialState.currentStep).toBe('initialized');
      expect(initialState.productsValidated).toBe(false);
      expect(initialState.updatesApplied).toBe(false);
      expect(initialState.errors).toEqual([]);
      expect(initialState.retryCount).toBe(0);
    });
  });
});