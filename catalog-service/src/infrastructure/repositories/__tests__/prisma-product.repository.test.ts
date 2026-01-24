/**
 * Prisma Product Repository Tests
 * Infrastructure layer testing for product persistence operations
 * Tests real database operations using mocked Prisma client
 *
 * Coverage Requirements (per Testing Constitution):
 * - Infrastructure Layer: 75% minimum, 80% target, 85% critical
 * - Real database testing patterns
 * - Error scenario validation
 * - Data persistence testing
 */

import { PrismaClient } from '@prisma/client';
import { PrismaProductRepository } from '../prisma-product.repository';
import { ProductRepository } from '../../../domain/interfaces';

// Mock Prisma client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    product: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn()
    },
    productVariant: {
      deleteMany: jest.fn(),
      createMany: jest.fn()
    },
    $transaction: jest.fn()
  }))
}));

describe('PrismaProductRepository', () => {
  let prismaClient: jest.Mocked<PrismaClient>;
  let repository: ProductRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    prismaClient = new PrismaClient() as jest.Mocked<PrismaClient>;
    repository = new PrismaProductRepository(prismaClient);
  });

  describe('save', () => {
    it('should save a product using transaction', async () => {
      // Arrange
      const mockProduct = {
        getId: jest.fn().mockReturnValue({ toString: () => 'test-product-id' }),
        getSellerId: jest.fn().mockReturnValue({ toString: () => 'seller-123' }),
        getName: jest.fn().mockReturnValue('Test Product'),
        getDescription: jest.fn().mockReturnValue('Test Description'),
        getCategoryId: jest.fn().mockReturnValue({ toString: () => 'category-123' }),
        getStatus: jest.fn().mockReturnValue({ toString: () => 'draft' }),
        getVisibility: jest.fn().mockReturnValue('PUBLIC'),
        getTags: jest.fn().mockReturnValue(['test']),
        getVariants: jest.fn().mockReturnValue([{
          getId: jest.fn().mockReturnValue('variant-1'),
          getSku: jest.fn().mockReturnValue('TEST-SKU'),
          getName: jest.fn().mockReturnValue('Variant'),
          getPrice: jest.fn().mockReturnValue({ toNumber: () => 99.99 }),
          getCompareAtPrice: jest.fn().mockReturnValue({ toNumber: () => 129.99 }),
          getCostPrice: jest.fn().mockReturnValue({ toNumber: () => 79.99 }),
          getAttributes: jest.fn().mockReturnValue({ color: 'red' })
        }])
      };

      const expectedResult = {
        id: 'test-product-id',
        sellerId: 'seller-123',
        title: 'Test Product',
        description: 'Test Description',
        categoryId: 'category-123',
        status: 'draft',
        visibility: 'public',
        tags: ['test'],
        updatedAt: expect.any(Date)
      };

      prismaClient.$transaction.mockImplementation(async (callback) => {
        return callback({
          product: {
            upsert: jest.fn().mockResolvedValue(expectedResult),
            ...prismaClient.product
          },
          productVariant: {
            deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
            createMany: jest.fn().mockResolvedValue({ count: 1 }),
            ...prismaClient.productVariant
          }
        });
      });

      // Act
      const result = await repository.save(mockProduct as any);

      // Assert
      expect(prismaClient.$transaction).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });

    it('should handle transaction failures', async () => {
      // Arrange
      const mockProduct = {
        getId: jest.fn().mockReturnValue({ toString: () => 'test-product-id' }),
        getSellerId: jest.fn().mockReturnValue({ toString: () => 'seller-123' }),
        getName: jest.fn().mockReturnValue('Test Product'),
        getDescription: jest.fn().mockReturnValue('Test Description'),
        getCategoryId: jest.fn().mockReturnValue(undefined),
        getStatus: jest.fn().mockReturnValue({ toString: () => 'draft' }),
        getVisibility: jest.fn().mockReturnValue('PUBLIC'),
        getTags: jest.fn().mockReturnValue([]),
        getVariants: jest.fn().mockReturnValue([])
      };

      const transactionError = new Error('Database transaction failed');
      prismaClient.$transaction.mockRejectedValue(transactionError);

      // Act & Assert
      await expect(repository.save(mockProduct as any)).rejects.toThrow('Database transaction failed');
    });
  });

  describe('findById', () => {
    it('should find product by ID', async () => {
      // Arrange
      const mockPrismaData = {
        id: 'test-product-id',
        sellerId: 'seller-123',
        title: 'Test Product',
        description: 'Test Description',
        categoryId: 'category-123',
        status: 'published',
        visibility: 'public',
        tags: ['test'],
        createdAt: new Date(),
        updatedAt: new Date(),
        category: { id: 'category-123', name: 'Test Category' },
        variants: [{
          id: 'variant-1',
          sku: 'TEST-SKU',
          name: 'Test Variant',
          price: 99.99,
          compareAtPrice: 129.99,
          costPrice: 79.99,
          attributes: { color: 'red' },
          status: 'active',
          inventoryQuantity: 50
        }]
      };

      prismaClient.product.findUnique.mockResolvedValue(mockPrismaData);

      // Act
      const result = await repository.findById('test-product-id');

      // Assert
      expect(prismaClient.product.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-product-id' },
        include: {
          category: true,
          variants: true
        }
      });
      expect(result).toBeDefined();
    });

    it('should return null when product not found', async () => {
      // Arrange
      prismaClient.product.findUnique.mockResolvedValue(null);

      // Act
      const result = await repository.findById('non-existent-id');

      // Assert
      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      prismaClient.product.findUnique.mockRejectedValue(dbError);

      // Act & Assert
      await expect(repository.findById('test-product-id')).rejects.toThrow('Database connection failed');
    });
  });

  describe('findBySeller', () => {
    it('should find products by seller ID', async () => {
      // Arrange
      const mockProducts = [{
        id: 'product-1',
        sellerId: 'seller-123',
        title: 'Product 1',
        description: 'Description 1',
        categoryId: 'cat-1',
        status: 'published',
        visibility: 'public',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        category: { id: 'cat-1', name: 'Category 1' },
        variants: []
      }];

      prismaClient.product.findMany.mockResolvedValue(mockProducts);

      // Act
      const result = await repository.findBySeller('seller-123');

      // Assert
      expect(prismaClient.product.findMany).toHaveBeenCalledWith({
        where: { sellerId: 'seller-123' },
        include: {
          category: true,
          variants: true
        },
        orderBy: { createdAt: 'desc' }
      });
      expect(result).toHaveLength(1);
    });

    it('should return empty array when seller has no products', async () => {
      // Arrange
      prismaClient.product.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.findBySeller('empty-seller-id');

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('findByCategory', () => {
    it('should find products by category ID', async () => {
      // Arrange
      const mockProducts = [{
        id: 'product-1',
        sellerId: 'seller-1',
        title: 'Category Product',
        description: 'Product in category',
        categoryId: 'test-category-id',
        status: 'published',
        visibility: 'public',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        category: { id: 'test-category-id', name: 'Test Category' },
        variants: []
      }];

      prismaClient.product.findMany.mockResolvedValue(mockProducts);

      // Act
      const result = await repository.findByCategory('test-category-id');

      // Assert
      expect(prismaClient.product.findMany).toHaveBeenCalledWith({
        where: { categoryId: 'test-category-id' },
        include: {
          category: true,
          variants: true
        },
        orderBy: { createdAt: 'desc' }
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('search', () => {
    it('should search products with filters and pagination', async () => {
      // Arrange
      const filters = {
        category: 'test-category-id',
        status: 'published',
        tags: ['electronics']
      };
      const pagination = { page: 1, limit: 10 };

      const searchResults = [{
        id: 'search-product-1',
        sellerId: 'seller-1',
        title: 'Search Result Product',
        description: 'Matching product',
        categoryId: 'test-category-id',
        status: 'published',
        visibility: 'public',
        tags: ['electronics'],
        createdAt: new Date(),
        updatedAt: new Date(),
        category: { id: 'test-category-id', name: 'Test Category' },
        variants: [{
          id: 'variant-1',
          sku: 'SEARCH-SKU',
          name: 'Search Variant',
          price: 99.99,
          compareAtPrice: null,
          costPrice: 80.00,
          attributes: {},
          status: 'active',
          inventoryQuantity: 25
        }]
      }];

      prismaClient.product.findMany.mockResolvedValue(searchResults);
      prismaClient.product.count.mockResolvedValue(1);

      // Act
      const result = await repository.search(filters, pagination);

      // Assert
      expect(prismaClient.product.findMany).toHaveBeenCalledWith({
        where: {
          categoryId: 'test-category-id',
          status: 'published',
          tags: { hasSome: ['electronics'] }
        },
        include: {
          category: true,
          variants: true
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' }
      });
      expect(result.products).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it('should handle empty search results', async () => {
      // Arrange
      const filters = {};
      const pagination = { page: 1, limit: 10 };

      prismaClient.product.findMany.mockResolvedValue([]);
      prismaClient.product.count.mockResolvedValue(0);

      // Act
      const result = await repository.search(filters, pagination);

      // Assert
      expect(result.products).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });
  });

  describe('updateStatus', () => {
    it('should update product status', async () => {
      // Arrange
      const updatedProductData = {
        id: 'test-product-id',
        sellerId: 'test-seller-id',
        title: 'Test Product',
        description: 'Test description',
        categoryId: 'test-category-id',
        status: 'suspended',
        visibility: 'public',
        tags: [],
        updatedAt: new Date(),
        category: { id: 'test-category-id', name: 'Test Category' },
        variants: []
      };

      prismaClient.product.update.mockResolvedValue(updatedProductData);

      // Act
      const result = await repository.updateStatus('test-product-id', 'suspended');

      // Assert
      expect(prismaClient.product.update).toHaveBeenCalledWith({
        where: { id: 'test-product-id' },
        data: {
          status: 'suspended',
          updatedAt: expect.any(Date)
        },
        include: {
          category: true,
          variants: true
        }
      });
      expect(result).toBeDefined();
    });
  });

  describe('delete', () => {
    it('should soft delete product successfully', async () => {
      // Arrange
      prismaClient.product.update.mockResolvedValue({
        id: 'test-product-id',
        status: 'archived',
        updatedAt: new Date()
      } as any);

      // Act
      const result = await repository.delete('test-product-id');

      // Assert
      expect(prismaClient.product.update).toHaveBeenCalledWith({
        where: { id: 'test-product-id' },
        data: {
          status: 'archived',
          updatedAt: expect.any(Date)
        }
      });
      expect(result).toBe(true);
    });

    it('should return false on delete failure', async () => {
      // Arrange
      const deleteError = new Error('Delete operation failed');
      prismaClient.product.update.mockRejectedValue(deleteError);

      // Act
      const result = await repository.delete('test-product-id');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle Prisma connection errors', async () => {
      // Arrange
      const connectionError = new Error('Connection timeout');
      prismaClient.product.findUnique.mockRejectedValue(connectionError);

      // Act & Assert
      await expect(repository.findById('test-id')).rejects.toThrow('Connection timeout');
    });

    it('should handle transaction rollback on failure', async () => {
      // Arrange
      const mockProduct = {
        getId: jest.fn().mockReturnValue({ toString: () => 'test-product-id' }),
        getSellerId: jest.fn().mockReturnValue({ toString: () => 'seller-123' }),
        getName: jest.fn().mockReturnValue('Test Product'),
        getDescription: jest.fn().mockReturnValue('Test Description'),
        getCategoryId: jest.fn().mockReturnValue(undefined),
        getStatus: jest.fn().mockReturnValue({ toString: () => 'draft' }),
        getVisibility: jest.fn().mockReturnValue('PUBLIC'),
        getTags: jest.fn().mockReturnValue([]),
        getVariants: jest.fn().mockReturnValue([])
      };

      const variantError = new Error('Variant creation failed');
      prismaClient.$transaction.mockImplementation(async (callback) => {
        return callback({
          product: {
            upsert: jest.fn().mockResolvedValue({ id: 'test-product-id' }),
            ...prismaClient.product
          },
          productVariant: {
            deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
            createMany: jest.fn().mockRejectedValue(variantError),
            ...prismaClient.productVariant
          }
        });
      });

      // Act & Assert
      await expect(repository.save(mockProduct as any)).rejects.toThrow('Variant creation failed');
    });
  });
});
