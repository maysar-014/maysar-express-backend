/**
 * Get Product Use Case Tests
 * 
 * Purpose: Validates product retrieval business logic and data aggregation
 * Scope: Application layer testing with mocked infrastructure dependencies
 * Coverage Target: 85% (use case business logic)
 * 
 * Test Categories:
 * - Product retrieval and data aggregation
 * - Media loading and recommendations
 * - Error handling and edge cases
 * - Multi-seller product queries
 */

import { 
  GetProductUseCase, 
  GetProductsBySellerUseCase,
  GetProductRequest
} from '../get-product.use-case';
import {
  ProductRepository,
  MediaRepository,
  SearchService
} from '../../../domain/interfaces';

describe('GetProductUseCase', () => {
  let useCase: GetProductUseCase;
  let mockProductRepository: jest.Mocked<ProductRepository>;
  let mockMediaRepository: jest.Mocked<MediaRepository>;
  let mockSearchService: jest.Mocked<SearchService>;

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

    useCase = new GetProductUseCase(
      mockProductRepository,
      mockMediaRepository,
      mockSearchService
    );
  });

  describe('when retrieving existing product', () => {
    it('should retrieve product with basic details', async () => {
      // Given: Valid product ID and existing product
      const productId = 'product-123';
      const mockProduct = {
        id: productId,
        sellerId: 'seller-456',
        name: 'Test Product',
        description: 'A test product',
        price: { amount: 99.99, currency: 'USD' },
        categoryId: 'category-789',
        type: 'physical',
        tags: ['electronics', 'gadget'],
        attributes: { color: 'blue' },
        status: 'active',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02')
      };

      const request: GetProductRequest = {
        productId,
        includeMedia: false,
        includeRecommendations: false
      };

      mockProductRepository.findById.mockResolvedValue(mockProduct);

      // When: Retrieving product
      const result = await useCase.execute(request);

      // Then: Should return product details
      expect(result.status).toBe('success');
      expect(result.message).toBe('Product retrieved successfully');
      expect(result.product).toEqual({
        id: productId,
        sellerId: 'seller-456',
        name: 'Test Product',
        description: 'A test product',
        price: { amount: 99.99, currency: 'USD' },
        categoryId: 'category-789',
        type: 'physical',
        tags: ['electronics', 'gadget'],
        attributes: { color: 'blue' },
        status: 'active',
        createdAt: mockProduct.createdAt,
        updatedAt: mockProduct.updatedAt
      });

      expect(mockProductRepository.findById).toHaveBeenCalledWith(productId);
    });

    it('should retrieve product with media when requested', async () => {
      // Given: Product with media files
      const productId = 'product-123';
      const mockProduct = {
        id: productId,
        sellerId: 'seller-456',
        name: 'Product with Media',
        description: 'Product description',
        price: { amount: 149.99, currency: 'USD' },
        categoryId: 'category-789',
        type: 'physical',
        tags: [],
        attributes: {},
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockMedia = [
        { id: 'media-1', url: 'https://example.com/image1.jpg', type: 'image', order: 0 },
        { id: 'media-2', url: 'https://example.com/image2.jpg', type: 'image', order: 1 }
      ];

      const request: GetProductRequest = {
        productId,
        includeMedia: true,
        includeRecommendations: false
      };

      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockMediaRepository.findByProduct.mockResolvedValue(mockMedia);

      // When: Retrieving product with media
      const result = await useCase.execute(request);

      // Then: Should include media in response
      expect(result.status).toBe('success');
      expect(result.product?.media).toHaveLength(2);
      expect(result.product?.media).toEqual([
        { id: 'media-1', url: 'https://example.com/image1.jpg', type: 'image', order: 0 },
        { id: 'media-2', url: 'https://example.com/image2.jpg', type: 'image', order: 1 }
      ]);

      expect(mockMediaRepository.findByProduct).toHaveBeenCalledWith(productId);
    });

    it('should retrieve product with recommendations when requested', async () => {
      // Given: Product with search service available
      const productId = 'product-123';
      const mockProduct = {
        id: productId,
        sellerId: 'seller-456',
        name: 'Electronics Product',
        description: 'Electronic gadget',
        price: { amount: 199.99, currency: 'USD' },
        categoryId: 'category-electronics',
        type: 'physical',
        tags: ['electronics', 'tech'],
        attributes: {},
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockRecommendations = [
        { id: 'rec-1', name: 'Similar Product 1', price: 179.99, score: 0.9 },
        { id: 'rec-2', name: 'Similar Product 2', price: 229.99, score: 0.8 }
      ];

      const request: GetProductRequest = {
        productId,
        includeMedia: false,
        includeRecommendations: true
      };

      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockSearchService.search.mockResolvedValue(mockRecommendations);

      // When: Retrieving product with recommendations
      const result = await useCase.execute(request);

      // Then: Should include recommendations
      expect(result.status).toBe('success');
      expect(result.product?.recommendations).toHaveLength(2);
      expect(result.product?.recommendations).toEqual([
        { productId: 'rec-1', name: 'Similar Product 1', price: 179.99, relevanceScore: 0.9 },
        { productId: 'rec-2', name: 'Similar Product 2', price: 229.99, relevanceScore: 0.8 }
      ]);
    });
  });

  describe('when handling errors', () => {
    it('should return error when product ID is missing', async () => {
      // Given: Request without product ID
      const request: GetProductRequest = {
        productId: '',
        includeMedia: false,
        includeRecommendations: false
      };

      // When: Executing without product ID
      const result = await useCase.execute(request);

      // Then: Should return error
      expect(result.status).toBe('error');
      expect(result.message).toBe('Product ID is required');
      expect(result.product).toBeUndefined();
    });

    it('should return not found when product does not exist', async () => {
      // Given: Non-existent product ID
      const request: GetProductRequest = {
        productId: 'nonexistent-product',
        includeMedia: false,
        includeRecommendations: false
      };

      mockProductRepository.findById.mockResolvedValue(null);

      // When: Retrieving non-existent product
      const result = await useCase.execute(request);

      // Then: Should return not found
      expect(result.status).toBe('not_found');
      expect(result.message).toBe('Product not found');
      expect(result.product).toBeUndefined();
    });

    it('should handle repository errors gracefully', async () => {
      // Given: Repository throws error
      const request: GetProductRequest = {
        productId: 'product-123',
        includeMedia: false,
        includeRecommendations: false
      };

      mockProductRepository.findById.mockRejectedValue(new Error('Database error'));

      // When: Repository fails
      const result = await useCase.execute(request);

      // Then: Should return error response
      expect(result.status).toBe('error');
      expect(result.message).toBe('Internal error occurred while retrieving product');
    });

    it('should handle media loading errors gracefully', async () => {
      // Given: Product exists but media loading fails
      const productId = 'product-123';
      const mockProduct = {
        id: productId,
        sellerId: 'seller-456',
        name: 'Test Product',
        description: 'Test description',
        price: { amount: 99.99, currency: 'USD' },
        categoryId: 'category-789',
        type: 'physical',
        tags: [],
        attributes: {},
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const request: GetProductRequest = {
        productId,
        includeMedia: true,
        includeRecommendations: false
      };

      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockMediaRepository.findByProduct.mockRejectedValue(new Error('Media service error'));

      // When: Media loading fails
      const result = await useCase.execute(request);

      // Then: Should return product without media
      expect(result.status).toBe('success');
      expect(result.product?.media).toEqual([]);
    });
  });
});

describe('GetProductsBySellerUseCase', () => {
  let useCase: GetProductsBySellerUseCase;
  let mockProductRepository: jest.Mocked<ProductRepository>;

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

    useCase = new GetProductsBySellerUseCase(mockProductRepository);
  });

  describe('when retrieving seller products', () => {
    it('should retrieve all products for seller', async () => {
      // Given: Seller with multiple products
      const sellerId = 'seller-123';
      const mockProducts = [
        {
          id: 'product-1',
          sellerId,
          name: 'Product 1',
          description: 'Description 1',
          price: { amount: 99.99, currency: 'USD' },
          categoryId: 'category-1',
          type: 'physical',
          tags: ['tag1'],
          attributes: {},
          status: 'active',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        },
        {
          id: 'product-2',
          sellerId,
          name: 'Product 2',
          description: 'Description 2',
          price: { amount: 149.99, currency: 'USD' },
          categoryId: 'category-2',
          type: 'digital',
          tags: ['tag2'],
          attributes: {},
          status: 'draft',
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-02')
        }
      ];

      mockProductRepository.findBySeller.mockResolvedValue(mockProducts);

      // When: Retrieving seller products
      const result = await useCase.execute(sellerId);

      // Then: Should return all products
      expect(result.status).toBe('success');
      expect(result.products).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.products[0].id).toBe('product-1');
      expect(result.products[1].id).toBe('product-2');
    });

    it('should filter products by status', async () => {
      // Given: Seller with products in different statuses
      const sellerId = 'seller-123';
      const mockProducts = [
        { id: 'product-1', sellerId, status: 'active', name: 'Active Product', description: 'Active', price: { amount: 99.99, currency: 'USD' }, categoryId: 'cat-1', type: 'physical', tags: [], attributes: {}, createdAt: new Date(), updatedAt: new Date() },
        { id: 'product-2', sellerId, status: 'draft', name: 'Draft Product', description: 'Draft', price: { amount: 149.99, currency: 'USD' }, categoryId: 'cat-2', type: 'digital', tags: [], attributes: {}, createdAt: new Date(), updatedAt: new Date() },
        { id: 'product-3', sellerId, status: 'active', name: 'Another Active', description: 'Active 2', price: { amount: 199.99, currency: 'USD' }, categoryId: 'cat-3', type: 'physical', tags: [], attributes: {}, createdAt: new Date(), updatedAt: new Date() }
      ];

      mockProductRepository.findBySeller.mockResolvedValue(mockProducts);

      // When: Filtering by active status
      const result = await useCase.execute(sellerId, { status: 'active' });

      // Then: Should return only active products
      expect(result.status).toBe('success');
      expect(result.products).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.products.every(p => p.status === 'active')).toBe(true);
    });

    it('should handle empty product list gracefully', async () => {
      // Given: Seller with no products
      const sellerId = 'seller-123';
      mockProductRepository.findBySeller.mockResolvedValue([]);

      // When: Retrieving products for seller with no products
      const result = await useCase.execute(sellerId);

      // Then: Should return empty list successfully
      expect(result.status).toBe('success');
      expect(result.products).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.message).toBe('Products retrieved successfully');
    });
  });

  describe('when handling errors', () => {
    it('should return error when seller ID is missing', async () => {
      // When: Executing without seller ID
      const result = await useCase.execute('');

      // Then: Should return error
      expect(result.status).toBe('error');
      expect(result.message).toBe('Seller ID is required');
      expect(result.products).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should handle repository errors gracefully', async () => {
      // Given: Repository throws error
      const sellerId = 'seller-123';
      mockProductRepository.findBySeller.mockRejectedValue(new Error('Database error'));

      // When: Repository fails
      const result = await useCase.execute(sellerId);

      // Then: Should return error response
      expect(result.status).toBe('error');
      expect(result.message).toBe('Internal error occurred while retrieving products');
      expect(result.products).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
});