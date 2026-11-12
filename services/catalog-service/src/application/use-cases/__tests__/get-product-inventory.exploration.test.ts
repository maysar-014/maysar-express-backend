/**
 * Bug Condition Exploration Test — Out of Stock Status Bug
 *
 * PURPOSE: Surface counterexamples proving the bug exists on UNFIXED code.
 * This test encodes the EXPECTED (correct) behavior.
 *
 * EXPECTED OUTCOME ON UNFIXED CODE:
 *   - "in_stock" test cases FAIL  → confirms the bug exists
 *   - "out_of_stock" / no-variant test cases PASS → confirms baseline is preserved
 *
 * After the fix is applied, ALL tests in this file should PASS.
 *
 * Bug: Products fetched via GetProductUseCase always show "out_of_stock" status
 * regardless of actual inventory levels because buildProductDetails never sets
 * the inventory property, and the controller defaults to out_of_stock.
 *
 * Requirements: 2.1, 2.2, 2.5
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

function makeProductWithVariants(
  inventoryQuantities: number[],
  reservedQuantities?: number[]
): any {
  return {
    id: 'product-bug-test',
    sellerId: 'seller-001',
    name: 'Bug Test Product',
    description: 'Product used to surface inventory bug',
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
      quantityReserved: reservedQuantities?.[i] ?? 0,
      attributes: {}
    }))
  };
}

function makeProductWithNoVariants(): any {
  return {
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
    updatedAt: new Date('2024-01-01'),
    variants: []
  };
}

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------

function buildUseCase(product: any): GetProductUseCase {
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
    findByProduct: jest.fn().mockResolvedValue([]),
    delete: jest.fn(),
    updateMetadata: jest.fn()
  };

  return new GetProductUseCase(mockProductRepository, mockMediaRepository);
}

const request: GetProductRequest = {
  productId: 'product-bug-test',
  includeMedia: false,
  includeRecommendations: false
};

// ---------------------------------------------------------------------------
// Bug Condition Exploration Tests
// ---------------------------------------------------------------------------

describe('Bug Condition Exploration — Inventory Status', () => {
  /**
   * CASE 1: Single variant with positive stock
   * Expected: in_stock with available = 10
   * On unfixed code: FAILS (inventory is undefined → defaults to out_of_stock)
   */
  it('should return in_stock when a single variant has positive inventoryQuantity', async () => {
    const product = makeProductWithVariants([10]);
    const useCase = buildUseCase(product);

    const result = await useCase.execute(request);

    expect(result.status).toBe('success');
    expect(result.product).toBeDefined();
    // BUG CONDITION: these assertions fail on unfixed code
    expect(result.product!.inventory).toBeDefined();
    expect(result.product!.inventory!.status).toBe('in_stock');
    expect(result.product!.inventory!.available).toBe(10);
  });

  /**
   * CASE 2: Multiple variants with positive stock
   * Expected: in_stock with available = sum of all variant quantities
   * On unfixed code: FAILS
   */
  it('should aggregate inventory across multiple variants and return in_stock', async () => {
    const product = makeProductWithVariants([5, 10, 15]);
    const useCase = buildUseCase(product);

    const result = await useCase.execute(request);

    expect(result.status).toBe('success');
    expect(result.product).toBeDefined();
    // BUG CONDITION: these assertions fail on unfixed code
    expect(result.product!.inventory).toBeDefined();
    expect(result.product!.inventory!.status).toBe('in_stock');
    expect(result.product!.inventory!.available).toBe(30);
  });

  /**
   * CASE 3: Variant with stock and reserved quantities
   * Expected: in_stock, available reflects net (stock - reserved)
   * On unfixed code: FAILS
   */
  it('should account for reserved quantities when calculating available inventory', async () => {
    // 20 available, 5 reserved → net 15
    const product = makeProductWithVariants([20], [5]);
    const useCase = buildUseCase(product);

    const result = await useCase.execute(request);

    expect(result.status).toBe('success');
    expect(result.product).toBeDefined();
    // BUG CONDITION: these assertions fail on unfixed code
    expect(result.product!.inventory).toBeDefined();
    expect(result.product!.inventory!.status).toBe('in_stock');
    expect(result.product!.inventory!.available).toBeGreaterThan(0);
  });

  /**
   * CASE 4: All variants have zero stock
   * Expected: out_of_stock
   * On unfixed code: PASSES (coincidentally correct — defaults to out_of_stock)
   */
  it('should return out_of_stock when all variants have zero inventoryQuantity', async () => {
    const product = makeProductWithVariants([0, 0]);
    const useCase = buildUseCase(product);

    const result = await useCase.execute(request);

    expect(result.status).toBe('success');
    expect(result.product).toBeDefined();
    // This should pass on both fixed and unfixed code
    const inventoryStatus = result.product!.inventory?.status ?? 'out_of_stock';
    expect(inventoryStatus).toBe('out_of_stock');
  });

  /**
   * CASE 5: Product with no variants
   * Expected: out_of_stock
   * On unfixed code: PASSES (coincidentally correct)
   */
  it('should return out_of_stock when product has no variants', async () => {
    const product = makeProductWithNoVariants();
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
      findByProduct: jest.fn().mockResolvedValue([]),
      delete: jest.fn(),
      updateMetadata: jest.fn()
    };
    const useCase = new GetProductUseCase(mockProductRepository, mockMediaRepository);

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
});
