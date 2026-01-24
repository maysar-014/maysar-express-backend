/**
 * Search Products Use Case Tests
 * 
 * Purpose: Validates product search business logic and faceted search capabilities
 * Scope: Application layer testing with mocked infrastructure dependencies
 * Coverage Target: 85% (use case business logic)
 * 
 * Test Categories:
 * - Search query processing and validation
 * - Filtering, sorting, and pagination logic
 * - Facet generation and search metadata
 * - Error handling and fallback mechanisms
 */

import { 
  SearchProductsUseCase, 
  SearchProductsRequest
} from '../search-products.use-case';
import {
  ProductRepository,
  CategoryRepository,
  SearchService
} from '../../../domain/interfaces';

describe('SearchProductsUseCase', () => {
  let useCase: SearchProductsUseCase;
  let mockProductRepository: jest.Mocked<ProductRepository>;
  let mockCategoryRepository: jest.Mocked<CategoryRepository>;
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

    mockCategoryRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findBySlug: jest.fn(),
      findSubcategories: jest.fn(),
      update: jest.fn()
    };

    mockSearchService = {
      index: jest.fn(),
      search: jest.fn(),
      remove: jest.fn(),
      update: jest.fn()
    };

    useCase = new SearchProductsUseCase(
      mockProductRepository,
      mockCategoryRepository,
      mockSearchService
    );
  });

  describe('when performing text search', () => {
    it('should perform search with basic filters', async () => {
      // Given: Valid search request with query
      const request: SearchProductsRequest = {
        query: 'electronics laptop',
        filters: {
          category: 'category-electronics',
          priceRange: { min: 100, max: 2000 }
        },
        sorting: { field: 'relevance', direction: 'desc' },
        pagination: { page: 1, limit: 20 }
      };

      const mockSearchResults = [
        {
          id: 'product-1',
          name: 'Gaming Laptop',
          description: 'High-performance gaming laptop',
          price: { amount: 1299.99, currency: 'USD' },
          categoryId: 'category-electronics',
          sellerId: 'seller-1',
          type: 'physical',
          tags: ['gaming', 'laptop'],
          status: 'active',
          score: 0.95,
          createdAt: new Date('2024-01-01')
        },
        {
          id: 'product-2',
          name: 'Business Laptop',
          description: 'Professional business laptop',
          price: { amount: 899.99, currency: 'USD' },
          categoryId: 'category-electronics',
          sellerId: 'seller-2',
          type: 'physical',
          tags: ['business', 'laptop'],
          status: 'active',
          score: 0.87,
          createdAt: new Date('2024-01-02')
        }
      ];

      const mockCategory = { id: 'category-electronics', name: 'Electronics' };

      mockSearchService.search.mockResolvedValue(mockSearchResults);
      mockCategoryRepository.findById.mockResolvedValue(mockCategory);

      // When: Executing search
      const result = await useCase.execute(request);

      // Then: Should return search results with facets
      expect(result.status).toBe('success');
      expect(result.message).toBe('Search completed successfully');
      expect(result.results).toHaveLength(2);
      expect(result.total).toBe(2);
      
      expect(mockSearchService.search).toHaveBeenCalledWith(
        'electronics laptop',
        expect.objectContaining({
          category: 'category-electronics',
          priceRange: { min: 100, max: 2000 }
        }),
        { limit: 1000, sortBy: 'relevance' }
      );

      expect(result.facets.categories).toContainEqual({
        id: 'category-electronics',
        name: 'Electronics',
        count: 2
      });

      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      });

      expect(result.searchMetadata.query).toBe('electronics laptop');
      expect(result.searchMetadata.totalResults).toBe(2);
      expect(result.searchMetadata.executionTime).toBeGreaterThan(0);
    });

    it('should perform filter-only search without query', async () => {
      // Given: Search request without text query
      const request: SearchProductsRequest = {
        filters: {
          category: 'category-books',
          seller: 'seller-123',
          status: 'active'
        },
        sorting: { field: 'price', direction: 'asc' },
        pagination: { page: 1, limit: 10 }
      };

      const mockRepositoryResults = [
        {
          id: 'product-3',
          name: 'Programming Book',
          description: 'Learn programming',
          price: { amount: 29.99, currency: 'USD' },
          categoryId: 'category-books',
          sellerId: 'seller-123',
          type: 'digital',
          tags: ['programming', 'education'],
          status: 'active',
          createdAt: new Date('2024-01-03')
        }
      ];

      mockProductRepository.search.mockResolvedValue(mockRepositoryResults);
      mockCategoryRepository.findById.mockResolvedValue({ id: 'category-books', name: 'Books' });

      // When: Executing filter-only search
      const result = await useCase.execute(request);

      // Then: Should use repository search
      expect(result.status).toBe('success');
      expect(result.results).toHaveLength(1);
      expect(mockProductRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({
          categoryId: 'category-books',
          sellerId: 'seller-123',
          status: 'active'
        }),
        { limit: 1000 }
      );
    });

    it('should apply sorting correctly', async () => {
      // Given: Search results with different prices
      const request: SearchProductsRequest = {
        query: 'products',
        filters: {},
        sorting: { field: 'price', direction: 'asc' },
        pagination: { page: 1, limit: 20 }
      };

      const mockResults = [
        { id: 'product-1', name: 'Expensive Product', price: { amount: 999.99 }, createdAt: new Date() },
        { id: 'product-2', name: 'Cheap Product', price: { amount: 19.99 }, createdAt: new Date() },
        { id: 'product-3', name: 'Medium Product', price: { amount: 99.99 }, createdAt: new Date() }
      ];

      mockSearchService.search.mockResolvedValue(mockResults);

      // When: Executing search with price sorting
      const result = await useCase.execute(request);

      // Then: Should sort by price ascending
      expect(result.status).toBe('success');
      expect(result.results[0].price.amount).toBe(19.99);
      expect(result.results[1].price.amount).toBe(99.99);
      expect(result.results[2].price.amount).toBe(999.99);
    });

    it('should apply pagination correctly', async () => {
      // Given: Many search results
      const request: SearchProductsRequest = {
        query: 'products',
        filters: {},
        sorting: { field: 'relevance', direction: 'desc' },
        pagination: { page: 2, limit: 5 }
      };

      const mockResults = Array.from({ length: 15 }, (_, i) => ({
        id: `product-${i + 1}`,
        name: `Product ${i + 1}`,
        description: 'Product description',
        price: { amount: 99.99, currency: 'USD' },
        categoryId: 'category-1',
        sellerId: 'seller-1',
        type: 'physical',
        tags: [],
        status: 'active',
        createdAt: new Date()
      }));

      mockSearchService.search.mockResolvedValue(mockResults);

      // When: Requesting page 2 with limit 5
      const result = await useCase.execute(request);

      // Then: Should return correct page
      expect(result.status).toBe('success');
      expect(result.results).toHaveLength(5);
      expect(result.results[0].id).toBe('product-6');
      expect(result.total).toBe(15);
      expect(result.pagination).toEqual({
        page: 2,
        limit: 5,
        totalPages: 3,
        hasNext: true,
        hasPrev: true
      });
    });
  });

  describe('when validating requests', () => {
    it('should reject invalid pagination parameters', async () => {
      // Given: Invalid pagination
      const request: SearchProductsRequest = {
        query: 'test',
        filters: {},
        sorting: { field: 'relevance', direction: 'desc' },
        pagination: { page: 0, limit: 150 }
      };

      // When: Executing with invalid pagination
      const result = await useCase.execute(request);

      // Then: Should return validation error
      expect(result.status).toBe('error');
      expect(result.message).toBe('Invalid search request');
    });

    it('should reject invalid price range', async () => {
      // Given: Invalid price range
      const request: SearchProductsRequest = {
        query: 'test',
        filters: {
          priceRange: { min: 100, max: 50 }
        },
        sorting: { field: 'relevance', direction: 'desc' },
        pagination: { page: 1, limit: 20 }
      };

      // When: Executing with invalid price range
      const result = await useCase.execute(request);

      // Then: Should return validation error
      expect(result.status).toBe('error');
      expect(result.message).toBe('Invalid search request');
    });

    it('should reject overly long search query', async () => {
      // Given: Query exceeding length limit
      const request: SearchProductsRequest = {
        query: 'x'.repeat(201),
        filters: {},
        sorting: { field: 'relevance', direction: 'desc' },
        pagination: { page: 1, limit: 20 }
      };

      // When: Executing with long query
      const result = await useCase.execute(request);

      // Then: Should return validation error
      expect(result.status).toBe('error');
      expect(result.message).toBe('Invalid search request');
    });
  });

  describe('when handling errors and fallbacks', () => {
    it('should fallback to repository when search service fails', async () => {
      // Given: Search service throws error
      const request: SearchProductsRequest = {
        query: 'electronics',
        filters: { category: 'category-electronics' },
        sorting: { field: 'relevance', direction: 'desc' },
        pagination: { page: 1, limit: 20 }
      };

      const mockRepositoryResults = [
        {
          id: 'product-1',
          name: 'Fallback Product',
          description: 'From repository',
          price: { amount: 99.99, currency: 'USD' },
          categoryId: 'category-electronics',
          sellerId: 'seller-1',
          type: 'physical',
          tags: [],
          status: 'active',
          createdAt: new Date()
        }
      ];

      mockSearchService.search.mockRejectedValue(new Error('Search service down'));
      mockProductRepository.search.mockResolvedValue(mockRepositoryResults);

      // When: Search service fails
      const result = await useCase.execute(request);

      // Then: Should fallback to repository
      expect(result.status).toBe('success');
      expect(result.results).toHaveLength(1);
      expect(result.results[0].name).toBe('Fallback Product');
      expect(mockProductRepository.search).toHaveBeenCalled();
    });

    it('should handle complete service failure', async () => {
      // Given: Both search service and repository fail
      const request: SearchProductsRequest = {
        query: 'products',
        filters: {},
        sorting: { field: 'relevance', direction: 'desc' },
        pagination: { page: 1, limit: 20 }
      };

      mockSearchService.search.mockRejectedValue(new Error('Search service error'));
      mockProductRepository.search.mockRejectedValue(new Error('Repository error'));

      // When: All services fail
      const result = await useCase.execute(request);

      // Then: Should return error response
      expect(result.status).toBe('error');
      expect(result.message).toBe('Internal error occurred during search');
      expect(result.results).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should handle empty search results', async () => {
      // Given: Search returns no results
      const request: SearchProductsRequest = {
        query: 'nonexistent product',
        filters: {},
        sorting: { field: 'relevance', direction: 'desc' },
        pagination: { page: 1, limit: 20 }
      };

      mockSearchService.search.mockResolvedValue([]);

      // When: No results found
      const result = await useCase.execute(request);

      // Then: Should handle empty results gracefully
      expect(result.status).toBe('success');
      expect(result.results).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.facets.categories).toEqual([]);
      expect(result.pagination.totalPages).toBe(0);
    });
  });

  describe('when applying filters', () => {
    it('should apply price range filter correctly', async () => {
      // Given: Results with various prices
      const request: SearchProductsRequest = {
        query: 'products',
        filters: {
          priceRange: { min: 50, max: 150 }
        },
        sorting: { field: 'relevance', direction: 'desc' },
        pagination: { page: 1, limit: 20 }
      };

      const mockResults = [
        { id: 'product-1', price: { amount: 25.99 }, createdAt: new Date() },
        { id: 'product-2', price: { amount: 99.99 }, createdAt: new Date() },
        { id: 'product-3', price: { amount: 199.99 }, createdAt: new Date() },
        { id: 'product-4', price: { amount: 75.50 }, createdAt: new Date() }
      ];

      mockSearchService.search.mockResolvedValue(mockResults);

      // When: Applying price filter
      const result = await useCase.execute(request);

      // Then: Should filter by price range
      expect(result.status).toBe('success');
      expect(result.results).toHaveLength(2);
      expect(result.results.every(p => p.price.amount >= 50 && p.price.amount <= 150)).toBe(true);
    });

    it('should apply tags filter correctly', async () => {
      // Given: Results with various tags
      const request: SearchProductsRequest = {
        query: 'products',
        filters: {
          tags: ['electronics', 'premium']
        },
        sorting: { field: 'relevance', direction: 'desc' },
        pagination: { page: 1, limit: 20 }
      };

      const mockResults = [
        { id: 'product-1', tags: ['electronics', 'gadget'], createdAt: new Date() },
        { id: 'product-2', tags: ['books', 'education'], createdAt: new Date() },
        { id: 'product-3', tags: ['premium', 'luxury'], createdAt: new Date() },
        { id: 'product-4', tags: ['basic'], createdAt: new Date() }
      ];

      mockSearchService.search.mockResolvedValue(mockResults);

      // When: Applying tags filter
      const result = await useCase.execute(request);

      // Then: Should filter by tags
      expect(result.status).toBe('success');
      expect(result.results).toHaveLength(2);
      expect(result.results[0].id).toBe('product-1');
      expect(result.results[1].id).toBe('product-3');
    });
  });
});