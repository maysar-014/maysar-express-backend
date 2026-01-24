/**
 * Product Entity Tests
 * Comprehensive domain entity testing for product business logic
 * Tests real entity implementation with deterministic behavior
 * Follows testing constitution: Fast, Isolated, Deterministic, Focused, Readable
 */

import { Product, ProductVariant } from '../product.entity';
import { ProductId, SellerId, CategoryId } from '../../value-objects/ids.value-object';
import { Price, CostPrice } from '../../value-objects/monetary.value-object';
import {
  ProductStatus,
  ProductStatusValue,
  ProductVisibility,
  ProductType,
  ProductCondition
} from '../../value-objects/product-types.value-object';

describe('ProductVariant', () => {
  const mockPrice = new Price(99.99, 'USD');
  const mockComparePrice = new Price(129.99, 'USD');
  const mockCostPrice = new CostPrice(50.00, 'USD');

  describe('creation and getters', () => {
    it('should create variant with all properties', () => {
      const variant = new ProductVariant(
        'variant-1',
        'SKU-001',
        'Red Variant',
        mockPrice,
        mockComparePrice,
        mockCostPrice,
        10,
        { color: 'red', size: 'M' }
      );

      expect(variant.getId()).toBe('variant-1');
      expect(variant.getSku()).toBe('SKU-001');
      expect(variant.getName()).toBe('Red Variant');
      expect(variant.getPrice()).toBe(mockPrice);
      expect(variant.getCompareAtPrice()).toBe(mockComparePrice);
      expect(variant.getCostPrice()).toBe(mockCostPrice);
      expect(variant.getInventoryQuantity()).toBe(10);
      expect(variant.getAttributes()).toEqual({ color: 'red', size: 'M' });
    });

    it('should create variant with minimal properties', () => {
      const variant = new ProductVariant('variant-1', 'SKU-001', 'Basic Variant', mockPrice);

      expect(variant.getId()).toBe('variant-1');
      expect(variant.getCompareAtPrice()).toBeUndefined();
      expect(variant.getCostPrice()).toBeUndefined();
      expect(variant.getInventoryQuantity()).toBe(0);
      expect(variant.getAttributes()).toEqual({});
    });
  });

  describe('business logic', () => {
    it('should check stock status correctly', () => {
      const inStockVariant = new ProductVariant('v1', 'SKU-1', 'In Stock', mockPrice, undefined, undefined, 5);
      const outOfStockVariant = new ProductVariant('v2', 'SKU-2', 'Out of Stock', mockPrice, undefined, undefined, 0);

      expect(inStockVariant.isInStock()).toBe(true);
      expect(outOfStockVariant.isInStock()).toBe(false);
    });

    it('should detect sale status correctly', () => {
      const onSaleVariant = new ProductVariant('v1', 'SKU-1', 'On Sale', mockPrice, mockComparePrice);
      const regularVariant = new ProductVariant('v2', 'SKU-2', 'Regular', mockPrice);

      expect(onSaleVariant.isOnSale()).toBe(true);
      expect(regularVariant.isOnSale()).toBe(false);
    });

    it('should calculate margin when cost price is available', () => {
      const variant = new ProductVariant('v1', 'SKU-1', 'With Cost', mockPrice, undefined, mockCostPrice);
      const variantNoCost = new ProductVariant('v2', 'SKU-2', 'No Cost', mockPrice);

      expect(variant.calculateMargin()).toBeCloseTo(49.99); // (99.99 - 50) / 99.99 * 100
      expect(variantNoCost.calculateMargin()).toBeNull();
    });
  });
});

describe('Product', () => {
  const mockSellerId = SellerId.fromString('seller-123');
  const mockCategoryId = CategoryId.fromString('category-456');
  const mockVariant = new ProductVariant('variant-1', 'SKU-001', 'Default Variant', new Price(99.99, 'USD'), undefined, undefined, 10);

  describe('creation and validation', () => {
    it('should create product with valid data', () => {
      const product = new Product(
        ProductId.fromString('product-123'),
        mockSellerId,
        'Test Product',
        'A test product description',
        new ProductStatusValue(ProductStatus.DRAFT),
        ProductType.PHYSICAL,
        ProductVisibility.PUBLIC,
        mockCategoryId,
        [mockVariant],
        ['image1.jpg', 'image2.jpg'],
        ['tag1', 'tag2']
      );

      expect(product.getName()).toBe('Test Product');
      expect(product.getDescription()).toBe('A test product description');
      expect(product.getSellerId()).toBe(mockSellerId);
      expect(product.getCategoryId()).toBe(mockCategoryId);
      expect(product.getVariants()).toHaveLength(1);
      expect(product.getImages()).toEqual(['image1.jpg', 'image2.jpg']);
      expect(product.getTags()).toEqual(['tag1', 'tag2']);
    });

    it('should throw error for empty name', () => {
      expect(() => {
        new Product(
          ProductId.fromString('product-123'),
          mockSellerId,
          '',
          'Description',
          new ProductStatusValue(ProductStatus.DRAFT),
          ProductType.PHYSICAL,
          ProductVisibility.PUBLIC,
          undefined,
          [mockVariant]
        );
      }).toThrow('Product name cannot be empty');
    });

    it('should throw error for empty description', () => {
      expect(() => {
        new Product(
          ProductId.fromString('product-123'),
          mockSellerId,
          'Name',
          '',
          new ProductStatusValue(ProductStatus.DRAFT),
          ProductType.PHYSICAL,
          ProductVisibility.PUBLIC,
          undefined,
          [mockVariant]
        );
      }).toThrow('Product description cannot be empty');
    });

    it('should throw error for no variants', () => {
      expect(() => {
        new Product(
          ProductId.fromString('product-123'),
          mockSellerId,
          'Name',
          'Description',
          new ProductStatusValue(ProductStatus.DRAFT),
          ProductType.PHYSICAL,
          ProductVisibility.PUBLIC,
          undefined,
          []
        );
      }).toThrow('Product must have at least one variant');
    });
  });

  describe('getters', () => {
    let product: Product;

    beforeEach(() => {
      product = new Product(
        ProductId.fromString('product-123'),
        mockSellerId,
        'Test Product',
        'Description',
        new ProductStatusValue(ProductStatus.PUBLISHED),
        ProductType.PHYSICAL,
        ProductVisibility.PUBLIC,
        mockCategoryId,
        [mockVariant],
        ['image1.jpg'],
        ['tag1']
      );
    });

    it('should return all properties correctly', () => {
      expect(product.getId().toString()).toBe('product-123');
      expect(product.getSellerId()).toBe(mockSellerId);
      expect(product.getName()).toBe('Test Product');
      expect(product.getDescription()).toBe('Description');
      expect(product.getStatus().getValue()).toBe(ProductStatus.PUBLISHED);
      expect(product.getType()).toBe(ProductType.PHYSICAL);
      expect(product.getVisibility()).toBe(ProductVisibility.PUBLIC);
      expect(product.getCategoryId()).toBe(mockCategoryId);
      expect(product.getCondition()).toBe(ProductCondition.NEW);
      expect(product.getCreatedAt()).toBeInstanceOf(Date);
      expect(product.getUpdatedAt()).toBeInstanceOf(Date);
    });

    it('should return default variant', () => {
      expect(product.getDefaultVariant()).toBe(mockVariant);
    });

    it('should return copies of arrays', () => {
      const images = product.getImages();
      const tags = product.getTags();
      const variants = product.getVariants();

      images.push('new-image.jpg');
      tags.push('new-tag');
      variants.push(mockVariant);

      expect(product.getImages()).toEqual(['image1.jpg']);
      expect(product.getTags()).toEqual(['tag1']);
      expect(product.getVariants()).toHaveLength(1);
    });
  });

  describe('business logic', () => {
    it('should check published status', () => {
      const publishedProduct = new Product(
        ProductId.fromString('product-1'),
        mockSellerId,
        'Published Product',
        'Description',
        new ProductStatusValue(ProductStatus.PUBLISHED),
        ProductType.PHYSICAL,
        ProductVisibility.PUBLIC,
        undefined,
        [mockVariant]
      );

      const draftProduct = new Product(
        ProductId.fromString('product-2'),
        mockSellerId,
        'Draft Product',
        'Description',
        new ProductStatusValue(ProductStatus.DRAFT),
        ProductType.PHYSICAL,
        ProductVisibility.PUBLIC,
        undefined,
        [mockVariant]
      );

      expect(publishedProduct.isPublished()).toBe(true);
      expect(draftProduct.isPublished()).toBe(false);
    });

    it('should check active status', () => {
      const activeProduct = new Product(
        ProductId.fromString('product-1'),
        mockSellerId,
        'Active Product',
        'Description',
        new ProductStatusValue(ProductStatus.PUBLISHED),
        ProductType.PHYSICAL,
        ProductVisibility.PUBLIC,
        undefined,
        [mockVariant]
      );

      expect(activeProduct.isActive()).toBe(true);
    });

    it('should check public visibility', () => {
      const publicProduct = new Product(
        ProductId.fromString('product-1'),
        mockSellerId,
        'Public Product',
        'Description',
        new ProductStatusValue(ProductStatus.PUBLISHED),
        ProductType.PHYSICAL,
        ProductVisibility.PUBLIC,
        undefined,
        [mockVariant]
      );

      const privateProduct = new Product(
        ProductId.fromString('product-2'),
        mockSellerId,
        'Private Product',
        'Description',
        new ProductStatusValue(ProductStatus.PUBLISHED),
        ProductType.PHYSICAL,
        ProductVisibility.PRIVATE,
        undefined,
        [mockVariant]
      );

      expect(publicProduct.isVisibleToPublic()).toBe(true);
      expect(privateProduct.isVisibleToPublic()).toBe(false);
    });

    it('should detect multiple variants', () => {
      const variant2 = new ProductVariant('variant-2', 'SKU-002', 'Second Variant', new Price(89.99, 'USD'));
      
      const singleVariantProduct = new Product(
        ProductId.fromString('product-1'),
        mockSellerId,
        'Single Variant',
        'Description',
        new ProductStatusValue(ProductStatus.DRAFT),
        ProductType.PHYSICAL,
        ProductVisibility.PUBLIC,
        undefined,
        [mockVariant]
      );

      const multiVariantProduct = new Product(
        ProductId.fromString('product-2'),
        mockSellerId,
        'Multi Variant',
        'Description',
        new ProductStatusValue(ProductStatus.DRAFT),
        ProductType.PHYSICAL,
        ProductVisibility.PUBLIC,
        undefined,
        [mockVariant, variant2]
      );

      expect(singleVariantProduct.hasVariants()).toBe(false);
      expect(multiVariantProduct.hasVariants()).toBe(true);
    });

    it('should calculate total inventory', () => {
      const variant1 = new ProductVariant('v1', 'SKU-1', 'Variant 1', new Price(99.99, 'USD'), undefined, undefined, 5);
      const variant2 = new ProductVariant('v2', 'SKU-2', 'Variant 2', new Price(89.99, 'USD'), undefined, undefined, 3);

      const product = new Product(
        ProductId.fromString('product-1'),
        mockSellerId,
        'Multi Variant',
        'Description',
        new ProductStatusValue(ProductStatus.DRAFT),
        ProductType.PHYSICAL,
        ProductVisibility.PUBLIC,
        undefined,
        [variant1, variant2]
      );

      expect(product.getTotalInventory()).toBe(8);
      expect(product.isInStock()).toBe(true);
    });

    it('should calculate price range', () => {
      const variant1 = new ProductVariant('v1', 'SKU-1', 'Expensive', new Price(199.99, 'USD'));
      const variant2 = new ProductVariant('v2', 'SKU-2', 'Cheap', new Price(99.99, 'USD'));
      const variant3 = new ProductVariant('v3', 'SKU-3', 'Medium', new Price(149.99, 'USD'));

      const product = new Product(
        ProductId.fromString('product-1'),
        mockSellerId,
        'Price Range Product',
        'Description',
        new ProductStatusValue(ProductStatus.DRAFT),
        ProductType.PHYSICAL,
        ProductVisibility.PUBLIC,
        undefined,
        [variant1, variant2, variant3]
      );

      const priceRange = product.getPriceRange();
      expect(priceRange.min.getAmount()).toBe(99.99);
      expect(priceRange.max.getAmount()).toBe(199.99);
    });

    it('should check status transitions', () => {
      const product = new Product(
        ProductId.fromString('product-1'),
        mockSellerId,
        'Test Product',
        'Description',
        new ProductStatusValue(ProductStatus.DRAFT),
        ProductType.PHYSICAL,
        ProductVisibility.PUBLIC,
        undefined,
        [mockVariant]
      );

      expect(product.canTransitionToStatus(ProductStatus.PUBLISHED)).toBe(true);
    });
  });

  describe('static factory method', () => {
    it('should create product using factory method', () => {
      const product = Product.create(
        mockSellerId,
        'Factory Product',
        'Created via factory',
        ProductType.DIGITAL,
        [mockVariant],
        {
          categoryId: mockCategoryId,
          visibility: ProductVisibility.PRIVATE,
          images: ['factory-image.jpg'],
          tags: ['factory'],
          condition: ProductCondition.USED
        }
      );

      expect(product.getName()).toBe('Factory Product');
      expect(product.getDescription()).toBe('Created via factory');
      expect(product.getType()).toBe(ProductType.DIGITAL);
      expect(product.getVisibility()).toBe(ProductVisibility.PRIVATE);
      expect(product.getCategoryId()).toBe(mockCategoryId);
      expect(product.getImages()).toEqual(['factory-image.jpg']);
      expect(product.getTags()).toEqual(['factory']);
      expect(product.getCondition()).toBe(ProductCondition.USED);
      expect(product.getStatus().getValue()).toBe(ProductStatus.DRAFT);
    });

    it('should create product with minimal options', () => {
      const product = Product.create(
        mockSellerId,
        'Minimal Product',
        'Minimal description',
        ProductType.PHYSICAL,
        [mockVariant]
      );

      expect(product.getName()).toBe('Minimal Product');
      expect(product.getCategoryId()).toBeUndefined();
      expect(product.getVisibility()).toBe(ProductVisibility.PUBLIC);
      expect(product.getImages()).toEqual([]);
      expect(product.getTags()).toEqual([]);
      expect(product.getCondition()).toBe(ProductCondition.NEW);
    });
  });
});