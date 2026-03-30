/**
 * Comprehensive Prisma Product Repository Tests
 * Tests all repository functionality including CRUD operations, search, validation, and error handling
 */

import { PrismaClient } from '@prisma/client';
import { PrismaProductRepository } from '../prisma-product.repository';
import { ProductId, SellerId, CategoryId } from '../../../domain/value-objects/ids.value-object';
import { Price } from '../../../domain/value-objects/monetary.value-object';
import { ProductType, ProductVisibility, ProductCondition } from '../../../domain/value-objects/product-types.value-object';
import { Product, ProductVariant } from '../../../domain/entities/product.entity';
import { ProductStatusValue } from '../../../domain/value-objects/product-types.value-object';

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
    $transaction: jest.fn(),
    $connect: jest.fn(),
    $disconnect: jest.fn()
  }))
}));

describe('PrismaProductRepository', () => {
  let repository: PrismaProductRepository;
  let mockPrisma: any;
  let mockProduct: any;
  let mockProductData: any;
  let mockPrismaProduct: any;

  beforeEach(() => {
    mockPrisma = new PrismaClient();
    repository = new PrismaProductRepository(mockPrisma);

    // Mock product entity
    const mockIdGenerator = {
      generate: () => 'generated-id',
      validate: () => true
    };

    mockProduct = {
      getId: () => ProductId.fromString('prod-123', mockIdGenerator),
      getSellerId: () => SellerId.fromString('seller-123', mockIdGenerator),
      getName: () => 'Test Product',
      getDescription: () => 'Test product description',
      getCategoryId: () => CategoryId.fromString('cat-123', mockIdGenerator),
      getStatus: () => ({ toString: () => 'published' }),
      getVisibility: () => ProductVisibility.PUBLIC,
      getTags: () => ['test', 'product'],
      getEnablerEnabled: () => false,
      getEnablerCommissionRate: () => undefined,
      getVariants: () => [
        {
          getId: () => 'variant-1',
          getSku: () => 'SKU-001',
          getName: () => 'Test Variant',
          getPrice: () => new Price(99.99, 'USD'),
          getCompareAtPrice: () => new Price(129.99, 'USD'),
          getCostPrice: () => 50.00,
          getAttributes: () => ({ color: 'red', size: 'M' }),
          getInventoryQuantity: () => 100
        }
      ]
    };

    // Mock Prisma product data
    mockPrismaProduct = {
      id: 'prod-123',
      sellerId: 'seller-123',
      title: 'Test Product',
      description: 'Test product description',
      categoryId: 'cat-123',
      status: 'published',
      visibility: 'public',
      tags: ['test', 'product'],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      category: {
        id: 'cat-123',
        name: 'Test Category',
        status: 'active'
      },
      variants: [
        {
          id: 'variant-1',
          sku: 'SKU-001',
          name: 'Test Variant',
          price: 99.99,
          compareAtPrice: 129.99,
          costPrice: 50.00,
          attributes: { color: 'red', size: 'M' },
          inventoryQuantity: 100,
          status: 'active'
        }
      ]
    };

    mockProductData = {
      id: 'prod-123',
      sellerId: 'seller-123',
      title: 'Test Product',
      description: 'Test product description',
      categoryId: 'cat-123',
      status: 'published',
      visibility: 'public',
      tags: ['test', 'product'],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      category: {
        id: 'cat-123',
        name: 'Test Category',
        status: 'active'
      },
      variants: [
        {
          id: 'variant-1',
          sku: 'SKU-001',
          name: 'Test Variant',
          price: 99.99,
          compareAtPrice: 129.99,
          costPrice: 50.00,
          attributes: { color: 'red', size: 'M' },
          inventoryQuantity: 100,
          status: 'active'
        }
      ]
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('save', () => {
    it('should save a new product successfully', async () => {
      const savedProduct = { ...mockPrismaProduct, id: 'prod-new' };
      mockPrisma.$transaction.mockResolvedValue(savedProduct);

      const result = await repository.save(mockProduct);

      expect(mockPrisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
      expect(result).toEqual(savedProduct);
    });

    it('should update an existing product successfully', async () => {
      const updatedProduct = { ...mockPrismaProduct, title: 'Updated Product' };
      mockPrisma.$transaction.mockResolvedValue(updatedProduct);

      const result = await repository.save(mockProduct);

      expect(mockPrisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
      expect(result).toEqual(updatedProduct);
    });

    it('should handle product variants correctly', async () => {
      mockPrisma.$transaction.mockResolvedValue(mockPrismaProduct);

      await repository.save(mockProduct);

      const transactionCallback = mockPrisma.$transaction.mock.calls[0][0];
      const mockTx = {
        product: { upsert: jest.fn().mockResolvedValue(mockPrismaProduct) },
        productVariant: {
          deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
          createMany: jest.fn().mockResolvedValue({ count: 1 })
        }
      };

      await transactionCallback(mockTx);

      expect(mockTx.productVariant.deleteMany).toHaveBeenCalledWith({
        where: { productId: 'prod-123' }
      });
      expect(mockTx.productVariant.createMany).toHaveBeenCalledWith({
        data: [
          {
            id: 'variant-1',
            sku: 'SKU-001',
            name: 'Test Variant',
            price: 99.99,
            compareAtPrice: 129.99,
            costPrice: 50.00,
            attributes: { color: 'red', size: 'M' },
            status: 'active',
            productId: 'prod-123'
          }
        ]
      });
    });

    it('should handle products without variants', async () => {
      const productWithoutVariants = {
        ...mockProduct,
        getVariants: () => []
      };

      mockPrisma.$transaction.mockResolvedValue(mockPrismaProduct);

      await repository.save(productWithoutVariants);

      const transactionCallback = mockPrisma.$transaction.mock.calls[0][0];
      const mockTx = {
        product: { upsert: jest.fn().mockResolvedValue(mockPrismaProduct) },
        productVariant: {
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
          createMany: jest.fn().mockResolvedValue({ count: 0 })
        }
      };

      await transactionCallback(mockTx);

      expect(mockTx.productVariant.deleteMany).toHaveBeenCalledWith({
        where: { productId: 'prod-123' }
      });
      expect(mockTx.productVariant.createMany).toHaveBeenCalledWith({
        data: []
      });
    });

    it('should handle transaction failures', async () => {
      mockPrisma.$transaction.mockRejectedValue(new Error('Database error'));

      await expect(repository.save(mockProduct)).rejects.toThrow('Database error');
    });
  });

  describe('findById', () => {
    it('should find product by ID successfully', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockPrismaProduct);

      const result = await repository.findById('prod-123');

      expect(mockPrisma.product.findUnique).toHaveBeenCalledWith({
        where: { id: 'prod-123' },
        include: {
          category: true,
          variants: true
        }
      });
      expect(result).toBeDefined();
    });

    it('should return null when product not found', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      const result = await repository.findById('prod-nonexistent');

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      mockPrisma.product.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(repository.findById('prod-123')).rejects.toThrow('Database error');
    });
  });

  describe('findBySeller', () => {
    it('should find products by seller successfully', async () => {
      const products = [mockPrismaProduct, { ...mockPrismaProduct, id: 'prod-456' }];
      mockPrisma.product.findMany.mockResolvedValue(products);

      const result = await repository.findBySeller('seller-123');

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: { sellerId: 'seller-123' },
        include: {
          category: true,
          variants: true
        },
        orderBy: { createdAt: 'desc' }
      });
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no products found', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);

      const result = await repository.findBySeller('seller-nonexistent');

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      mockPrisma.product.findMany.mockRejectedValue(new Error('Database error'));

      await expect(repository.findBySeller('seller-123')).rejects.toThrow('Database error');
    });
  });

  describe('findByCategory', () => {
    it('should find products by category successfully', async () => {
      const products = [mockPrismaProduct, { ...mockPrismaProduct, id: 'prod-456' }];
      mockPrisma.product.findMany.mockResolvedValue(products);

      const result = await repository.findByCategory('cat-123');

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: { categoryId: 'cat-123' },
        include: {
          category: true,
          variants: true
        },
        orderBy: { createdAt: 'desc' }
      });
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no products found', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);

      const result = await repository.findByCategory('cat-nonexistent');

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      mockPrisma.product.findMany.mockRejectedValue(new Error('Database error'));

      await expect(repository.findByCategory('cat-123')).rejects.toThrow('Database error');
    });
  });

  describe('search', () => {
    it('should search products with basic filters', async () => {
      const products = [mockPrismaProduct];
      mockPrisma.product.findMany.mockResolvedValue(products);
      mockPrisma.product.count.mockResolvedValue(1);

      const filters = { category: 'cat-123', seller: 'seller-123' };
      const pagination = { page: 1, limit: 10 };

      const result = await repository.search(filters, pagination);

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: {
          categoryId: 'cat-123',
          sellerId: 'seller-123'
        },
        include: {
          category: true,
          variants: true
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' }
      });
      expect(mockPrisma.product.count).toHaveBeenCalledWith({
        where: {
          categoryId: 'cat-123',
          sellerId: 'seller-123'
        }
      });
      expect(result.products).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it('should search products with status filter', async () => {
      mockPrisma.product.findMany.mockResolvedValue([mockPrismaProduct]);
      mockPrisma.product.count.mockResolvedValue(1);

      const filters = { status: 'published' };
      const pagination = { page: 1, limit: 10 };

      await repository.search(filters, pagination);

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: {
          status: 'published'
        },
        include: {
          category: true,
          variants: true
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' }
      });
    });

    it('should search products with visibility filter', async () => {
      mockPrisma.product.findMany.mockResolvedValue([mockPrismaProduct]);
      mockPrisma.product.count.mockResolvedValue(1);

      const filters = { visibility: 'public' };
      const pagination = { page: 1, limit: 10 };

      await repository.search(filters, pagination);

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: {
          visibility: 'public'
        },
        include: {
          category: true,
          variants: true
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' }
      });
    });

    it('should search products with tags filter', async () => {
      mockPrisma.product.findMany.mockResolvedValue([mockPrismaProduct]);
      mockPrisma.product.count.mockResolvedValue(1);

      const filters = { tags: ['test', 'product'] };
      const pagination = { page: 1, limit: 10 };

      await repository.search(filters, pagination);

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: {
          tags: {
            hasSome: ['test', 'product']
          }
        },
        include: {
          category: true,
          variants: true
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' }
      });
    });

    it('should search products with price range filter', async () => {
      mockPrisma.product.findMany.mockResolvedValue([mockPrismaProduct]);
      mockPrisma.product.count.mockResolvedValue(1);

      const filters = { priceRange: { min: 50, max: 150 } };
      const pagination = { page: 1, limit: 10 };

      await repository.search(filters, pagination);

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: {
          variants: {
            some: {
              price: {
                gte: 50,
                lte: 150
              }
            }
          }
        },
        include: {
          category: true,
          variants: true
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' }
      });
    });

    it('should handle pagination correctly', async () => {
      mockPrisma.product.findMany.mockResolvedValue([mockPrismaProduct]);
      mockPrisma.product.count.mockResolvedValue(25);

      const filters = {};
      const pagination = { page: 2, limit: 10 };

      const result = await repository.search(filters, pagination);

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          category: true,
          variants: true
        },
        skip: 10,
        take: 10,
        orderBy: { createdAt: 'desc' }
      });
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total).toBe(25);
      expect(result.pagination.totalPages).toBe(3);
      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.hasPrev).toBe(true);
    });

    it('should handle empty search results', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(0);

      const result = await repository.search({}, { page: 1, limit: 10 });

      expect(result.products).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
      expect(result.pagination.hasNext).toBe(false);
      expect(result.pagination.hasPrev).toBe(false);
    });

    it('should handle database errors', async () => {
      mockPrisma.product.findMany.mockRejectedValue(new Error('Database error'));

      await expect(repository.search({}, { page: 1, limit: 10 })).rejects.toThrow('Database error');
    });
  });

  describe('updateStatus', () => {
    it('should update product status successfully', async () => {
      const updatedProduct = { ...mockPrismaProduct, status: 'archived' };
      mockPrisma.product.update.mockResolvedValue(updatedProduct);

      const result = await repository.updateStatus('prod-123', 'archived');

      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-123' },
        data: {
          status: 'archived',
          updatedAt: expect.any(Date)
        },
        include: {
          category: true,
          variants: true
        }
      });
      expect(result).toEqual(updatedProduct);
    });

    it('should handle product not found', async () => {
      mockPrisma.product.update.mockRejectedValue(new Error('Record not found'));

      await expect(repository.updateStatus('prod-nonexistent', 'archived')).rejects.toThrow('Record not found');
    });

    it('should handle invalid status', async () => {
      mockPrisma.product.update.mockResolvedValue(mockPrismaProduct);

      // Test with invalid status - should map to draft
      await repository.updateStatus('prod-123', 'invalid-status');

      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-123' },
        data: {
          status: 'draft', // Should map invalid status to draft
          updatedAt: expect.any(Date)
        },
        include: {
          category: true,
          variants: true
        }
      });
    });
  });

  describe('delete', () => {
    it('should delete product successfully (soft delete)', async () => {
      mockPrisma.product.update.mockResolvedValue(mockPrismaProduct);

      const result = await repository.delete('prod-123');

      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-123' },
        data: {
          status: 'archived',
          updatedAt: expect.any(Date)
        }
      });
      expect(result).toBe(true);
    });

    it('should handle delete failure', async () => {
      mockPrisma.product.update.mockRejectedValue(new Error('Database error'));

      const result = await repository.delete('prod-123');

      expect(result).toBe(false);
    });

    it('should handle product not found', async () => {
      mockPrisma.product.update.mockRejectedValue(new Error('Record not found'));

      const result = await repository.delete('prod-nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle connection errors gracefully', async () => {
      mockPrisma.$transaction.mockRejectedValue(new Error('Connection failed'));

      await expect(repository.save(mockProduct)).rejects.toThrow('Connection failed');
    });

    it('should handle timeout errors', async () => {
      mockPrisma.product.findUnique.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 100);
        });
      });

      await expect(repository.findById('prod-123')).rejects.toThrow('Timeout');
    });

    it('should handle constraint violations', async () => {
      mockPrisma.$transaction.mockRejectedValue(new Error('Unique constraint violation'));

      await expect(repository.save(mockProduct)).rejects.toThrow('Unique constraint violation');
    });
  });

  describe('data mapping', () => {
    it('should map Prisma data to domain entity correctly', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockPrismaProduct);

      const result = await repository.findById('prod-123');

      expect(result).toBeDefined();
      expect(result.id).toBe('prod-123');
      expect(result.title).toBe('Test Product');
      expect(result.variants).toHaveLength(1);
      expect(result.variants[0].price).toBe(99.99);
    });

    it('should handle products without category', async () => {
      const productWithoutCategory = {
        ...mockPrismaProduct,
        category: null
      };
      mockPrisma.product.findUnique.mockResolvedValue(productWithoutCategory);

      const result = await repository.findById('prod-123');

      expect(result).toBeDefined();
      expect(result.category).toBeNull();
    });

    it('should handle products without variants', async () => {
      const productWithoutVariants = {
        ...mockPrismaProduct,
        variants: []
      };
      mockPrisma.product.findUnique.mockResolvedValue(productWithoutVariants);

      const result = await repository.findById('prod-123');

      expect(result).toBeDefined();
      expect(result.variants).toHaveLength(0);
    });
  });

  describe('performance', () => {
    it('should handle large result sets efficiently', async () => {
      const largeProductSet = Array.from({ length: 1000 }, (_, i) => ({
        ...mockPrismaProduct,
        id: `prod-${i}`
      }));

      mockPrisma.product.findMany.mockResolvedValue(largeProductSet.slice(0, 100));
      mockPrisma.product.count.mockResolvedValue(1000);

      const result = await repository.search({}, { page: 1, limit: 100 });

      expect(result.products).toHaveLength(100);
      expect(result.pagination.total).toBe(1000);
    });

    it('should handle concurrent operations', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockPrismaProduct);

      const promises = Array.from({ length: 10 }, () =>
        repository.findById('prod-123')
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach(result => expect(result).toBeDefined());
    });
  });
});
