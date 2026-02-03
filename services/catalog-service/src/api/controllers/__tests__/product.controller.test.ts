/**
 * Product Controller Tests
 * Comprehensive API layer testing for product operations
 * Validates HTTP request/response handling, validation, and use case orchestration
 * Tests real controller implementation with mocked external dependencies
 */

import { Request, Response } from 'express';
import { ProductController } from '../product.controller';
import { CreateProductUseCase, GetProductUseCase, GetProductsBySellerUseCase, SearchProductsUseCase } from '../../../application/use-cases';
import { ProductMapper } from '../../../application/mappers/product-mapper';

// Mock external dependencies (use cases and mappers)
jest.mock('../../../application/use-cases');
jest.mock('../../../application/mappers/product-mapper');

// Mock Express objects
const mockResponse = () => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis()
  };
  return res as Response;
};

const mockRequest = (body = {}, params = {}, query = {}, headers = {}): Request => {
  return {
    body,
    params,
    query,
    headers
  } as Request;
};

describe('ProductController', () => {
  let controller: ProductController;
  let mockCreateProductUseCase: jest.Mocked<CreateProductUseCase>;
  let mockGetProductUseCase: jest.Mocked<GetProductUseCase>;
  let mockGetProductsBySellerUseCase: jest.Mocked<GetProductsBySellerUseCase>;
  let mockSearchProductsUseCase: jest.Mocked<SearchProductsUseCase>;
  let mockProductMapper: jest.Mocked<ProductMapper>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock instances with mocked execute methods
    mockCreateProductUseCase = {
      execute: jest.fn()
    } as any;

    mockGetProductUseCase = {
      execute: jest.fn()
    } as any;

    mockGetProductsBySellerUseCase = {
      execute: jest.fn()
    } as any;

    mockSearchProductsUseCase = {
      execute: jest.fn()
    } as any;

    mockProductMapper = {
      toEntity: jest.fn(),
      toSummaryDto: jest.fn(),
      toDetailsDto: jest.fn(),
      toValidationDto: jest.fn()
    } as any;

    controller = new ProductController(
      mockCreateProductUseCase,
      mockGetProductUseCase,
      mockGetProductsBySellerUseCase,
      mockSearchProductsUseCase,
      mockProductMapper
    );
  });

  describe('createProduct', () => {
    it('should create a product successfully', async () => {
      const req = mockRequest({
        sellerId: 'seller-123',
        name: 'Test Product',
        description: 'A test product',
        price: 99.99,
        categoryId: 'category-123',
        type: 'physical',
        inventoryCount: 10
      });
      const res = mockResponse();

      mockCreateProductUseCase.execute.mockResolvedValue({
        status: 'success',
        productId: 'product-123',
        message: 'Product created successfully'
      });

      await controller.createProduct(req, res);

      expect(mockCreateProductUseCase.execute).toHaveBeenCalledWith({
        sellerId: 'seller-123',
        name: 'Test Product',
        description: 'A test product',
        price: 99.99,
        currency: 'USD',
        categoryId: 'category-123',
        type: 'physical',
        tags: [],
        mediaUrls: [],
        inventoryCount: 10,
        attributes: {}
      });

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { productId: 'product-123' },
        meta: expect.objectContaining({
          timestamp: expect.any(Date)
        })
      });
    });

    it('should handle validation errors', async () => {
      const req = mockRequest({
        // Missing required fields
        name: '',
        price: -10
      });
      const res = mockResponse();

      await controller.createProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed'
        }),
        meta: expect.objectContaining({
          timestamp: expect.any(Date)
        })
      });
    });

    it('should handle business rule violations', async () => {
      const req = mockRequest({
        sellerId: 'seller-123',
        name: 'Test Product',
        description: 'A test product',
        price: 99.99,
        categoryId: 'category-123',
        type: 'physical'
      });
      const res = mockResponse();

      mockCreateProductUseCase.execute.mockResolvedValue({
        status: 'business_rule_violation',
        productId: '',
        message: 'Product name already exists'
      });

      await controller.createProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          code: 'BUSINESS_RULE_VIOLATION',
          message: 'Product name already exists'
        }),
        meta: expect.objectContaining({
          timestamp: expect.any(Date)
        })
      });
    });

    it('should handle internal errors', async () => {
      const req = mockRequest({
        sellerId: 'seller-123',
        name: 'Test Product',
        description: 'A test product',
        price: 99.99,
        categoryId: 'category-123',
        type: 'physical'
      });
      const res = mockResponse();

      mockCreateProductUseCase.execute.mockRejectedValue(new Error('Database connection failed'));

      await controller.createProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }),
        meta: expect.objectContaining({
          timestamp: expect.any(Date)
        })
      });
    });
  });

  describe('getProduct', () => {
    it('should get a product successfully', async () => {
      const req = mockRequest({}, { id: 'product-123' }, { includeMedia: 'true' });
      const res = mockResponse();

      const mockProduct = {
        id: 'product-123',
        name: 'Test Product',
        description: 'A test product',
        price: { amount: 99.99, currency: 'USD', originalPrice: 99.99 },
        categoryId: 'category-123',
        sellerId: 'seller-123',
        type: 'physical',
        tags: ['test'],
        attributes: {},
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockGetProductUseCase.execute.mockResolvedValue({
        status: 'success',
        product: mockProduct,
        message: 'Product retrieved successfully'
      } as any);

      await controller.getProduct(req, res);

      expect(mockGetProductUseCase.execute).toHaveBeenCalledWith({
        productId: 'product-123',
        includeMedia: true,
        includeRecommendations: false
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          id: 'product-123',
          name: 'Test Product'
        }),
        meta: expect.objectContaining({
          timestamp: expect.any(Date)
        })
      });
    });

    it('should handle missing product ID', async () => {
      const req = mockRequest({}, {}, {});
      const res = mockResponse();

      await controller.getProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed'
        }),
        meta: expect.objectContaining({
          timestamp: expect.any(Date)
        })
      });
    });

    it('should handle product not found', async () => {
      const req = mockRequest({}, { id: 'non-existent' }, {});
      const res = mockResponse();

      mockGetProductUseCase.execute.mockResolvedValue({
        status: 'not_found',
        message: 'Product not found'
      });

      await controller.getProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          code: 'NOT_FOUND',
          message: 'Product not found'
        }),
        meta: expect.objectContaining({
          timestamp: expect.any(Date)
        })
      });
    });
  });

  describe('getProductsBySeller', () => {
    it('should get products by seller with pagination', async () => {
      const req = mockRequest({}, { sellerId: 'seller-123' }, { page: '1', limit: '10' });
      const res = mockResponse();

      const mockProducts = [
        {
          id: 'product-1',
          name: 'Product 1',
          price: { amount: 99.99, currency: 'USD' },
          categoryId: 'category-1',
          sellerId: 'seller-123',
          type: 'physical',
          tags: ['tag1'],
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
          description: 'Test product',
          attributes: {}
        }
      ];

      mockGetProductsBySellerUseCase.execute.mockResolvedValue({
        status: 'success',
        products: mockProducts,
        total: 1,
        message: 'Products retrieved successfully'
      });

      await controller.getProductsBySeller(req, res);

      expect(mockGetProductsBySellerUseCase.execute).toHaveBeenCalledWith('seller-123', {
        status: undefined,
        limit: 10,
        offset: 0
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            id: 'product-1',
            name: 'Product 1'
          })
        ]),
        meta: expect.objectContaining({
          pagination: expect.objectContaining({
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          })
        })
      });
    });

    it('should handle missing seller ID', async () => {
      const req = mockRequest({}, {}, {});
      const res = mockResponse();

      await controller.getProductsBySeller(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed'
        }),
        meta: expect.objectContaining({
          timestamp: expect.any(Date)
        })
      });
    });

    it('should handle use case failure', async () => {
      const req = mockRequest({}, { sellerId: 'seller-123' }, {});
      const res = mockResponse();

      mockGetProductsBySellerUseCase.execute.mockResolvedValue({
        status: 'error',
        products: [],
        total: 0,
        message: 'Database error'
      });

      await controller.getProductsBySeller(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('searchProducts', () => {
    it('should search products successfully', async () => {
      const req = mockRequest({}, {}, { q: 'laptop', category: 'electronics' });
      const res = mockResponse();

      const mockSearchResult = {
        status: 'success' as const,
        results: [
          {
            id: 'product-1',
            name: 'Gaming Laptop',
            description: 'High-performance gaming laptop',
            price: { amount: 1299.99, currency: 'USD' },
            categoryId: 'electronics',
            sellerId: 'seller-123',
            type: 'physical',
            tags: ['gaming', 'laptop'],
            status: 'active',
            createdAt: new Date()
          }
        ],
        total: 50,
        pagination: {
          page: 1,
          limit: 20,
          totalPages: 3,
          hasNext: true,
          hasPrev: false
        },
        searchMetadata: {
          query: 'laptop',
          executionTime: 150,
          totalResults: 50
        },
        facets: {
          categories: [],
          tags: [],
          priceRanges: [],
          productTypes: []
        },
        message: 'Search completed successfully'
      };

      mockSearchProductsUseCase.execute.mockResolvedValue(mockSearchResult);

      await controller.searchProducts(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.any(Array),
        meta: expect.objectContaining({
          pagination: expect.objectContaining({
            page: 1,
            limit: 20,
            total: 50
          })
        })
      }));
    });

    it('should validate search request parameters', async () => {
      const req = mockRequest({}, {}, { page: '-1', limit: '1000' });
      const res = mockResponse();

      await controller.searchProducts(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle search use case failure', async () => {
      const req = mockRequest({}, {}, { q: 'laptop' });
      const res = mockResponse();

      mockSearchProductsUseCase.execute.mockResolvedValue({
        status: 'error' as const,
        results: [],
        total: 0,
        pagination: { page: 1, limit: 20, totalPages: 0, hasNext: false, hasPrev: false },
        searchMetadata: { query: 'laptop', executionTime: 0, totalResults: 0 },
        facets: { categories: [], tags: [], priceRanges: [], productTypes: [] },
        message: 'Search service unavailable'
      });

      await controller.searchProducts(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('updateProduct', () => {
    it('should update product successfully', async () => {
      const req = mockRequest(
        { name: 'Updated Product', price: 199.99 },
        { id: 'product-123' }
      );
      const res = mockResponse();

      await controller.updateProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { productId: 'product-123', updated: true },
        meta: expect.objectContaining({
          timestamp: expect.any(Date)
        })
      });
    });

    it('should handle missing product ID', async () => {
      const req = mockRequest({ name: 'Updated Product' }, {});
      const res = mockResponse();

      await controller.updateProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should validate update request', async () => {
      const req = mockRequest(
        { name: '', price: -10 },
        { id: 'product-123' }
      );
      const res = mockResponse();

      await controller.updateProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('deleteProduct', () => {
    it('should delete product successfully', async () => {
      const req = mockRequest({}, { id: 'product-123' });
      const res = mockResponse();

      await controller.deleteProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { productId: 'product-123', deleted: true },
        meta: expect.objectContaining({
          timestamp: expect.any(Date)
        })
      });
    });

    it('should handle missing product ID', async () => {
      const req = mockRequest({}, {});
      const res = mockResponse();

      await controller.deleteProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('publishProduct', () => {
    it('should publish product successfully', async () => {
      const req = mockRequest({}, { id: 'product-123' });
      const res = mockResponse();

      await controller.publishProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { productId: 'product-123', published: true },
        meta: expect.objectContaining({
          timestamp: expect.any(Date)
        })
      });
    });

    it('should handle missing product ID', async () => {
      const req = mockRequest({}, {});
      const res = mockResponse();

      await controller.publishProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getProductAnalytics', () => {
    it('should get product analytics successfully', async () => {
      const req = mockRequest({}, { id: 'product-123' }, { period: '7d' });
      const res = mockResponse();

      await controller.getProductAnalytics(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          productId: 'product-123',
          period: '7d',
          metrics: expect.any(Object)
        }),
        meta: expect.objectContaining({
          timestamp: expect.any(Date)
        })
      });
    });

    it('should handle missing product ID', async () => {
      const req = mockRequest({}, {});
      const res = mockResponse();

      await controller.getProductAnalytics(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('error handling', () => {
    it('should handle unexpected errors in createProduct', async () => {
      const req = mockRequest({
        sellerId: 'seller-123',
        name: 'Test Product',
        description: 'A test product',
        price: 99.99,
        categoryId: 'category-123',
        type: 'physical'
      });
      const res = mockResponse();

      mockCreateProductUseCase.execute.mockRejectedValue(new Error('Unexpected error'));

      await controller.createProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should handle unexpected errors in other methods', async () => {
      const req = mockRequest({}, { id: 'product-123' });
      const res = mockResponse();

      mockGetProductUseCase.execute.mockRejectedValue(new Error('Database error'));

      await controller.getProduct(req, res);
      await controller.updateProduct(req, res);
      await controller.deleteProduct(req, res);
      await controller.publishProduct(req, res);
      await controller.getProductAnalytics(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('validation edge cases', () => {
    it('should validate price range in search', async () => {
      const req = mockRequest({}, {}, { minPrice: '100', maxPrice: '50' });
      const res = mockResponse();

      await controller.searchProducts(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle tags validation in update', async () => {
      const req = mockRequest(
        { tags: 'not-an-array' },
        { id: 'product-123' }
      );
      const res = mockResponse();

      await controller.updateProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});

