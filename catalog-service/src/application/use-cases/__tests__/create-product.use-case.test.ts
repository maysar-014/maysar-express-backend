/**
 * Create Product Use Case Tests
 * 
 * Purpose: Validates product creation business logic and orchestration
 * Scope: Application layer testing with mocked infrastructure dependencies
 * Coverage Target: 85% (use case business logic)
 * 
 * Test Categories:
 * - Request validation and business rules
 * - Domain entity creation and persistence
 * - Event publishing and error handling
 * - Edge cases and error scenarios
 */

import { CreateProductUseCase, CreateProductRequest } from '../create-product.use-case';
import {
  ProductRepository,
  CategoryRepository,
  SellerRepository,
  MediaRepository,
  DomainEventPublisher,
  IdGenerator,
  DateTimeService
} from '../../../domain/interfaces';
import { ProductType } from '../../../domain/value-objects/product-types.value-object';

describe('CreateProductUseCase', () => {
  let useCase: CreateProductUseCase;
  let mockProductRepository: jest.Mocked<ProductRepository>;
  let mockCategoryRepository: jest.Mocked<CategoryRepository>;
  let mockSellerRepository: jest.Mocked<SellerRepository>;
  let mockMediaRepository: jest.Mocked<MediaRepository>;
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

    mockSellerRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      updateProfile: jest.fn(),
      updateMetrics: jest.fn()
    };

    mockMediaRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByProduct: jest.fn(),
      delete: jest.fn(),
      updateMetadata: jest.fn()
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

    useCase = new CreateProductUseCase(
      mockProductRepository,
      mockCategoryRepository,
      mockSellerRepository,
      mockMediaRepository,
      mockEventPublisher,
      mockIdGenerator,
      mockDateTimeService
    );
  });

  describe('when creating product with valid data', () => {
    it('should create product successfully', async () => {
      // Given: Valid product creation request
      const request: CreateProductRequest = {
        sellerId: 'seller-123',
        name: 'Test Product',
        description: 'A test product description',
        price: 99.99,
        currency: 'USD',
        categoryId: 'category-456',
        type: ProductType.PHYSICAL,
        tags: ['electronics', 'gadget'],
        mediaUrls: ['https://example.com/image1.jpg'],
        inventoryCount: 100,
        attributes: { color: 'blue', size: 'medium' }
      };

      const mockSeller = { id: 'seller-123', status: 'active' };
      const mockCategory = { id: 'category-456', name: 'Electronics' };
      const mockProductId = 'product-789';
      const mockDate = new Date('2024-01-01T00:00:00Z');

      mockSellerRepository.findById.mockResolvedValue(mockSeller);
      mockCategoryRepository.findById.mockResolvedValue(mockCategory);
      mockProductRepository.findBySeller.mockResolvedValue([]);
      mockIdGenerator.generate.mockReturnValue(mockProductId);
      mockDateTimeService.now.mockReturnValue(mockDate);
      mockProductRepository.save.mockResolvedValue({});
      mockMediaRepository.save.mockResolvedValue({});
      mockEventPublisher.publish.mockResolvedValue();

      // When: Executing product creation
      const result = await useCase.execute(request);

      // Then: Product should be created successfully
      expect(result.status).toBe('success');
      expect(result.productId).toBe(mockProductId);
      expect(result.message).toBe('Product created successfully');

      expect(mockSellerRepository.findById).toHaveBeenCalledWith('seller-123');
      expect(mockCategoryRepository.findById).toHaveBeenCalledWith('category-456');
      expect(mockProductRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockProductId,
          sellerId: 'seller-123',
          name: 'Test Product',
          description: 'A test product description'
        })
      );
      expect(mockMediaRepository.save).toHaveBeenCalledTimes(1);
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'ProductCreated',
          aggregateId: mockProductId
        })
      );
    });

    it('should create product without media URLs', async () => {
      // Given: Product request without media
      const request: CreateProductRequest = {
        sellerId: 'seller-123',
        name: 'Simple Product',
        description: 'A simple product',
        price: 49.99,
        categoryId: 'category-456',
        type: ProductType.DIGITAL,
        tags: [],
        mediaUrls: [],
        inventoryCount: 50,
        attributes: {}
      };

      mockSellerRepository.findById.mockResolvedValue({ id: 'seller-123' });
      mockCategoryRepository.findById.mockResolvedValue({ id: 'category-456' });
      mockProductRepository.findBySeller.mockResolvedValue([]);
      mockIdGenerator.generate.mockReturnValue('product-789');
      mockDateTimeService.now.mockReturnValue(new Date());
      mockProductRepository.save.mockResolvedValue({});
      mockEventPublisher.publish.mockResolvedValue();

      // When: Creating product
      const result = await useCase.execute(request);

      // Then: Product created without media processing
      expect(result.status).toBe('success');
      expect(mockMediaRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('when validating request', () => {
    it('should reject request with missing required fields', async () => {
      // Given: Invalid request with missing fields
      const request: CreateProductRequest = {
        sellerId: '',
        name: '',
        description: '',
        price: 0,
        categoryId: '',
        type: ProductType.PHYSICAL,
        tags: [],
        mediaUrls: [],
        inventoryCount: 0,
        attributes: {}
      };

      // When: Executing with invalid request
      const result = await useCase.execute(request);

      // Then: Should return validation error
      expect(result.status).toBe('validation_error');
      expect(result.violations).toContain('Product name is required');
      expect(result.violations).toContain('Product description is required');
      expect(result.violations).toContain('Valid product price is required');
      expect(result.violations).toContain('Seller ID is required');
      expect(result.violations).toContain('Category ID is required');
    });

    it('should reject request with invalid field lengths', async () => {
      // Given: Request with fields exceeding limits
      const request: CreateProductRequest = {
        sellerId: 'seller-123',
        name: 'x'.repeat(201),
        description: 'x'.repeat(5001),
        price: 150000,
        categoryId: 'category-456',
        type: ProductType.PHYSICAL,
        tags: Array(21).fill('tag'),
        mediaUrls: [],
        inventoryCount: 100,
        attributes: {}
      };

      // When: Executing with invalid lengths
      const result = await useCase.execute(request);

      // Then: Should return validation errors
      expect(result.status).toBe('validation_error');
      expect(result.violations).toContain('Product name must be less than 200 characters');
      expect(result.violations).toContain('Product description must be less than 5000 characters');
      expect(result.violations).toContain('Product price cannot exceed $100,000');
      expect(result.violations).toContain('Product cannot have more than 20 tags');
    });
  });

  describe('when validating business rules', () => {
    it('should reject request when seller not found', async () => {
      // Given: Valid request but seller doesn't exist
      const request: CreateProductRequest = {
        sellerId: 'nonexistent-seller',
        name: 'Test Product',
        description: 'Test description',
        price: 99.99,
        categoryId: 'category-456',
        type: ProductType.PHYSICAL,
        tags: [],
        mediaUrls: [],
        inventoryCount: 100,
        attributes: {}
      };

      mockSellerRepository.findById.mockResolvedValue(null);

      // When: Executing with nonexistent seller
      const result = await useCase.execute(request);

      // Then: Should return business rule violation
      expect(result.status).toBe('business_rule_violation');
      expect(result.message).toBe('Seller not found');
      expect(mockProductRepository.save).not.toHaveBeenCalled();
    });

    it('should reject request when seller exceeds product limit', async () => {
      // Given: Seller at maximum product limit
      const request: CreateProductRequest = {
        sellerId: 'seller-123',
        name: 'Test Product',
        description: 'Test description',
        price: 99.99,
        categoryId: 'category-456',
        type: ProductType.PHYSICAL,
        tags: [],
        mediaUrls: [],
        inventoryCount: 100,
        attributes: {}
      };

      const existingProducts = Array(1000).fill({ id: 'product' });
      mockSellerRepository.findById.mockResolvedValue({ id: 'seller-123' });
      mockCategoryRepository.findById.mockResolvedValue({ id: 'category-456' });
      mockProductRepository.findBySeller.mockResolvedValue(existingProducts);

      // When: Executing when at product limit
      const result = await useCase.execute(request);

      // Then: Should return business rule violation
      expect(result.status).toBe('business_rule_violation');
      expect(result.message).toBe('Seller has reached maximum product limit');
    });
  });

  describe('when handling errors', () => {
    it('should handle repository errors gracefully', async () => {
      // Given: Valid request but repository throws error
      const request: CreateProductRequest = {
        sellerId: 'seller-123',
        name: 'Test Product',
        description: 'Test description',
        price: 99.99,
        categoryId: 'category-456',
        type: ProductType.PHYSICAL,
        tags: [],
        mediaUrls: [],
        inventoryCount: 100,
        attributes: {}
      };

      mockSellerRepository.findById.mockRejectedValue(new Error('Database error'));

      // When: Repository throws error
      const result = await useCase.execute(request);

      // Then: Should return error response
      expect(result.status).toBe('business_rule_violation');
      expect(result.message).toBe('Business rule validation failed');
      expect(result.violations).toContain('Business rule validation failed');
    });
  });
});