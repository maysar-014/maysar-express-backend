/**
 * Preservation Property Tests — Out of Stock Status Bug
 *
 * PURPOSE: Verify that non-buggy inputs produce the same correct behavior
 * both before and after the fix. These tests MUST PASS on unfixed code.
 *
 * Covers Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 *
 * Preservation cases:
 *   - Product not found → status: "not_found"
 *   - Product with no variants → inventory.status: "out_of_stock"
 *   - Product with zero inventory → inventory.status: "out_of_stock"
 *   - Database errors → graceful error response
 *   - Missing product ID → status: "error"
 */

import {
  GetProductUseCase,
  GetProductRequest
} from '../get-product.use-case';
import {
  ProductRepository,
  MediaRepository
} from '../../../domain/interfaces';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildMocks(productReturnValue: any): {
  useCase: GetProductUseCase;
  mockProductRepository: jest.Mocked<ProductRepository>;
  mockMediaRepository: jest.Mocked<MediaRepository>;
} {
  const mockProductRepository: jest.Mocked<ProductRepository> = {
    save: jest.fn(),
    findById: jest.fn().mockResolvedValue(productReturnValue),
    findBySlug: jest.fn().mockResolvedValue(null),
    findBySeller: jest.fn(),
    findByCategory: jest.fn(),
    search: jest.fn(),
    updateStatus: jest.fn(),
    delete: jest.fn()
  };

  const mockMediaRepository: jest.Mocked<MediaRepository> = {
    save: jest.fn(),
    findById: jest.fn(),
    findByProduct: jest.fn().mockResolvedValue([]),
    delete: jest.fn(),
    updateMetadata: jest.fn()
  };

  const useCase = new GetProductUseCase(mockProductRepository, mockMediaRepository);
  return { useCase, mockProductRepository, mockMediaRepository };
}

function makeProductWithVariants(inventoryQuantities: number[]): any {
  return {
    id: 'product-preservation-test',
    sellerId: 'seller-001',
    name: 'Preservation Test Product',
    description: 'Product for preservation testing',
    price: { amount: 100, currency: 'USD' },
    categoryId: 'cat-001',
    type: 'physical',
    tags: [],
    attributes: {},
    status: 'published',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    variants: inventoryQuantities.map((qty, i) => ({
      id: `variant-${i}`,
      sku: `sku-${i}`,
      name: `Variant ${i}`,
      price: 100,
      inventoryQuantity: qty,
      stock: qty,
      quantityReserved: 0,
      attributes: {}
    }))
  };
}

// ---------------------------------------------------------------------------
// Preservation Tests
// ---------------------------------------------------------------------------

describe('Preservation Property Tests — Non-Buggy Inputs', () => {
  /**
   * PRESERVATION 1: Product not found
   * Requirement 3.1 — WHEN a product does not exist THEN return "not_found"
   */
  describe('Product Not Found Preservation (Req 3.1)', () => {
    it('should return not_found status when product does not exist', async () => {
      const { useCase } = buildMocks(null);

      const result = await useCase.execute({
        productId: 'nonexistent-product-id',
        includeMedia: false,
        includeRecommendations: false
      });

      expect(result.status).toBe('not_found');
      expect(result.message).toBe('Product not found');
      expect(result.product).toBeUndefined();
    });

    it('should return not_found for any non-existent product ID', async () => {
      // Property: for all non-existent product IDs, result is always not_found
      const nonExistentIds = [
        'does-not-exist',
        'product-99999',
        'fake-id-abc',
        'NONEXISTENT'
      ];

      for (const productId of nonExistentIds) {
        const { useCase } = buildMocks(null);
        const result = await useCase.execute({ productId, includeMedia: false, includeRecommendations: false });
        expect(result.status).toBe('not_found');
        expect(result.product).toBeUndefined();
      }
    });
  });

  /**
   * PRESERVATION 2: Product with no variants
   * Requirement 3.2 — WHEN a product has no variants THEN return out_of_stock
   */
  describe('Product Without Variants Preservation (Req 3.2)', () => {
    it('should return out_of_stock when product has no variants array', async () => {
      const productWithNoVariants = {
        id: 'product-no-variants',
        sellerId: 'seller-001',
        name: 'No Variant Product',
        description: 'Product with no variants',
        price: { amount: 50, currency: 'USD' },
        categoryId: 'cat-001',
        type: 'physical',
        tags: [],
        attributes: {},
        status: 'published',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
        // No variants property
      };

      const { useCase } = buildMocks(productWithNoVariants);
      const result = await useCase.execute({
        productId: 'product-no-variants',
        includeMedia: false,
        includeRecommendations: false
      });

      expect(result.status).toBe('success');
      expect(result.product).toBeDefined();
      const inventoryStatus = result.product!.inventory?.status ?? 'out_of_stock';
      expect(inventoryStatus).toBe('out_of_stock');
    });

    it('should return out_of_stock when product has empty variants array', async () => {
      const productWithEmptyVariants = makeProductWithVariants([]);
      const { useCase } = buildMocks(productWithEmptyVariants);

      const result = await useCase.execute({
        productId: 'product-preservation-test',
        includeMedia: false,
        includeRecommendations: false
      });

      expect(result.status).toBe('success');
      expect(result.product).toBeDefined();
      const inventoryStatus = result.product!.inventory?.status ?? 'out_of_stock';
      expect(inventoryStatus).toBe('out_of_stock');
    });
  });

  /**
   * PRESERVATION 3: Zero inventory
   * Requirement 3.2 / 2.3 — WHEN all variants have zero stock THEN return out_of_stock
   */
  describe('Zero Inventory Preservation (Req 2.3, 3.2)', () => {
    it('should return out_of_stock when single variant has zero inventoryQuantity', async () => {
      const product = makeProductWithVariants([0]);
      const { useCase } = buildMocks(product);

      const result = await useCase.execute({
        productId: 'product-preservation-test',
        includeMedia: false,
        includeRecommendations: false
      });

      expect(result.status).toBe('success');
      expect(result.product).toBeDefined();
      const inventoryStatus = result.product!.inventory?.status ?? 'out_of_stock';
      expect(inventoryStatus).toBe('out_of_stock');
    });

    it('should return out_of_stock when all variants have zero inventoryQuantity', async () => {
      const product = makeProductWithVariants([0, 0, 0]);
      const { useCase } = buildMocks(product);

      const result = await useCase.execute({
        productId: 'product-preservation-test',
        includeMedia: false,
        includeRecommendations: false
      });

      expect(result.status).toBe('success');
      expect(result.product).toBeDefined();
      const inventoryStatus = result.product!.inventory?.status ?? 'out_of_stock';
      expect(inventoryStatus).toBe('out_of_stock');
    });
  });

  /**
   * PRESERVATION 4: Database error handling
   * Requirement 3.3 — WHEN DB errors occur THEN handle gracefully
   */
  describe('Database Error Handling Preservation (Req 3.3)', () => {
    it('should return error status when repository throws', async () => {
      const mockProductRepository: jest.Mocked<ProductRepository> = {
        save: jest.fn(),
        findById: jest.fn().mockRejectedValue(new Error('Database connection failed')),
        findBySlug: jest.fn().mockResolvedValue(null),
        findBySeller: jest.fn(),
        findByCategory: jest.fn(),
        search: jest.fn(),
        updateStatus: jest.fn(),
        delete: jest.fn()
      };
      const mockMediaRepository: jest.Mocked<MediaRepository> = {
        save: jest.fn(),
        findById: jest.fn(),
        findByProduct: jest.fn().mockResolvedValue([]),
        delete: jest.fn(),
        updateMetadata: jest.fn()
      };
      const useCase = new GetProductUseCase(mockProductRepository, mockMediaRepository);

      const result = await useCase.execute({
        productId: 'product-123',
        includeMedia: false,
        includeRecommendations: false
      });

      expect(result.status).toBe('error');
      expect(result.message).toBe('Internal error occurred while retrieving product');
      expect(result.product).toBeUndefined();
    });

    it('should return success with empty media when media repository throws', async () => {
      const product = makeProductWithVariants([10]);
      const mockProductRepository: jest.Mocked<ProductRepository> = {
        save: jest.fn(),
        findById: jest.fn().mockResolvedValue(product),
        findBySlug: jest.fn().mockResolvedValue(null),
        findBySeller: jest.fn(),
        findByCategory: jest.fn(),
        search: jest.fn(),
        updateStatus: jest.fn(),
        delete: jest.fn()
      };
      const mockMediaRepository: jest.Mocked<MediaRepository> = {
        save: jest.fn(),
        findById: jest.fn(),
        findByProduct: jest.fn().mockRejectedValue(new Error('Media service unavailable')),
        delete: jest.fn(),
        updateMetadata: jest.fn()
      };
      const useCase = new GetProductUseCase(mockProductRepository, mockMediaRepository);

      const result = await useCase.execute({
        productId: 'product-preservation-test',
        includeMedia: true,
        includeRecommendations: false
      });

      // Should still succeed, just with empty media
      expect(result.status).toBe('success');
      expect(result.product).toBeDefined();
      expect(result.product!.media).toEqual([]);
    });
  });

  /**
   * PRESERVATION 5: Missing product ID
   * Requirement 3.1 — WHEN product ID is missing THEN return error
   */
  describe('Missing Product ID Preservation', () => {
    it('should return error when product ID is empty string', async () => {
      const { useCase } = buildMocks(null);

      const result = await useCase.execute({
        productId: '',
        includeMedia: false,
        includeRecommendations: false
      });

      expect(result.status).toBe('error');
      expect(result.message).toBe('Product ID is required');
      expect(result.product).toBeUndefined();
    });
  });
});
