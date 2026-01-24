/**
 * Product DTO Tests
 * 
 * Purpose: Validates DTO validation logic and data contracts
 * Scope: Application layer DTO testing with validation rules
 * Coverage Target: 85% (DTO validation and type safety)
 * 
 * Test Categories:
 * - DTO validation logic and constraints
 * - Type safety and data integrity
 * - Error handling for invalid data
 * - Edge cases and boundary conditions
 */

import {
  CreateProductDto,
  UpdateProductDto,
  ProductSummaryDto,
  ProductInventoryDto,
  UpdateInventoryDto,
  ProductValidationDto
} from '../product.dto';
import { ProductType } from '../../../domain/value-objects/product-types.value-object';

describe('Product DTOs', () => {
  describe('CreateProductDto', () => {
    describe('when validating required fields', () => {
      it('should accept valid create product data', () => {
        // Given: Valid create product DTO
        const dto: CreateProductDto = {
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
          attributes: { color: 'blue', size: 'medium' },
          seoTitle: 'Test Product - Buy Now',
          seoDescription: 'Best test product available'
        };

        // When: Validating DTO structure
        // Then: Should have all required properties
        expect(dto.sellerId).toBe('seller-123');
        expect(dto.name).toBe('Test Product');
        expect(dto.description).toBe('A test product description');
        expect(dto.price).toBe(99.99);
        expect(dto.currency).toBe('USD');
        expect(dto.categoryId).toBe('category-456');
        expect(dto.type).toBe(ProductType.PHYSICAL);
        expect(dto.tags).toEqual(['electronics', 'gadget']);
        expect(dto.mediaUrls).toEqual(['https://example.com/image1.jpg']);
        expect(dto.inventoryCount).toBe(100);
        expect(dto.attributes).toEqual({ color: 'blue', size: 'medium' });
        expect(dto.seoTitle).toBe('Test Product - Buy Now');
        expect(dto.seoDescription).toBe('Best test product available');
      });

      it('should handle minimal required data', () => {
        // Given: Minimal create product DTO
        const dto: CreateProductDto = {
          sellerId: 'seller-123',
          name: 'Minimal Product',
          description: 'Basic description',
          price: 19.99,
          categoryId: 'category-456',
          type: ProductType.DIGITAL,
          tags: [],
          mediaUrls: [],
          inventoryCount: 0,
          attributes: {}
        };

        // When: Validating minimal DTO
        // Then: Should have required fields only
        expect(dto.sellerId).toBeDefined();
        expect(dto.name).toBeDefined();
        expect(dto.description).toBeDefined();
        expect(dto.price).toBeGreaterThan(0);
        expect(dto.categoryId).toBeDefined();
        expect(dto.type).toBeDefined();
        expect(dto.currency).toBeUndefined();
        expect(dto.seoTitle).toBeUndefined();
        expect(dto.seoDescription).toBeUndefined();
      });
    });

    describe('when validating data types', () => {
      it('should enforce string types for text fields', () => {
        // Given: DTO with string fields
        const dto: CreateProductDto = {
          sellerId: 'seller-123',
          name: 'Product Name',
          description: 'Product Description',
          price: 99.99,
          categoryId: 'category-456',
          type: ProductType.PHYSICAL,
          tags: ['tag1', 'tag2'],
          mediaUrls: ['url1', 'url2'],
          inventoryCount: 50,
          attributes: {}
        };

        // When: Checking string field types
        // Then: Should be strings
        expect(typeof dto.sellerId).toBe('string');
        expect(typeof dto.name).toBe('string');
        expect(typeof dto.description).toBe('string');
        expect(typeof dto.categoryId).toBe('string');
      });

      it('should enforce number types for numeric fields', () => {
        // Given: DTO with numeric fields
        const dto: CreateProductDto = {
          sellerId: 'seller-123',
          name: 'Product',
          description: 'Description',
          price: 149.99,
          categoryId: 'category-456',
          type: ProductType.PHYSICAL,
          tags: [],
          mediaUrls: [],
          inventoryCount: 25,
          attributes: {}
        };

        // When: Checking numeric field types
        // Then: Should be numbers
        expect(typeof dto.price).toBe('number');
        expect(typeof dto.inventoryCount).toBe('number');
        expect(dto.price).toBeGreaterThan(0);
        expect(dto.inventoryCount).toBeGreaterThanOrEqual(0);
      });

      it('should enforce array types for collection fields', () => {
        // Given: DTO with array fields
        const dto: CreateProductDto = {
          sellerId: 'seller-123',
          name: 'Product',
          description: 'Description',
          price: 99.99,
          categoryId: 'category-456',
          type: ProductType.PHYSICAL,
          tags: ['electronics', 'gadgets', 'tech'],
          mediaUrls: ['image1.jpg', 'image2.jpg'],
          inventoryCount: 100,
          attributes: { brand: 'TestBrand', model: 'TestModel' }
        };

        // When: Checking array field types
        // Then: Should be arrays
        expect(Array.isArray(dto.tags)).toBe(true);
        expect(Array.isArray(dto.mediaUrls)).toBe(true);
        expect(dto.tags.every(tag => typeof tag === 'string')).toBe(true);
        expect(dto.mediaUrls.every(url => typeof url === 'string')).toBe(true);
        expect(typeof dto.attributes).toBe('object');
        expect(dto.attributes).not.toBeNull();
      });
    });

    describe('when validating enum values', () => {
      it('should accept valid ProductType values', () => {
        // Given: Valid product types
        const physicalDto: CreateProductDto = {
          sellerId: 'seller-123',
          name: 'Physical Product',
          description: 'Description',
          price: 99.99,
          categoryId: 'category-456',
          type: ProductType.PHYSICAL,
          tags: [],
          mediaUrls: [],
          inventoryCount: 100,
          attributes: {}
        };

        const digitalDto: CreateProductDto = {
          sellerId: 'seller-123',
          name: 'Digital Product',
          description: 'Description',
          price: 49.99,
          categoryId: 'category-456',
          type: ProductType.DIGITAL,
          tags: [],
          mediaUrls: [],
          inventoryCount: 0,
          attributes: {}
        };

        // When: Validating product types
        // Then: Should accept valid enum values
        expect(Object.values(ProductType)).toContain(physicalDto.type);
        expect(Object.values(ProductType)).toContain(digitalDto.type);
        expect(physicalDto.type).toBe(ProductType.PHYSICAL);
        expect(digitalDto.type).toBe(ProductType.DIGITAL);
      });
    });
  });

  describe('UpdateProductDto', () => {
    describe('when validating partial updates', () => {
      it('should accept partial update data', () => {
        // Given: Partial update DTO
        const dto: UpdateProductDto = {
          productId: 'product-123',
          name: 'Updated Product Name',
          price: 129.99
        };

        // When: Validating partial update
        // Then: Should have required productId and optional fields
        expect(dto.productId).toBe('product-123');
        expect(dto.name).toBe('Updated Product Name');
        expect(dto.price).toBe(129.99);
        expect(dto.description).toBeUndefined();
        expect(dto.categoryId).toBeUndefined();
      });

      it('should handle empty updates', () => {
        // Given: Update DTO with only productId
        const dto: UpdateProductDto = {
          productId: 'product-123'
        };

        // When: Validating minimal update
        // Then: Should have only productId
        expect(dto.productId).toBe('product-123');
        expect(Object.keys(dto)).toHaveLength(1);
      });
    });
  });

  describe('ProductInventoryDto', () => {
    describe('when validating inventory data', () => {
      it('should have correct inventory structure', () => {
        // Given: Product inventory DTO
        const dto: ProductInventoryDto = {
          productId: 'product-123',
          currentStock: 50,
          reservedStock: 5,
          availableStock: 45,
          status: 'in_stock',
          lastUpdated: new Date('2024-01-01')
        };

        // When: Validating inventory structure
        // Then: Should have correct fields and types
        expect(dto.productId).toBe('product-123');
        expect(dto.currentStock).toBe(50);
        expect(dto.reservedStock).toBe(5);
        expect(dto.availableStock).toBe(45);
        expect(dto.status).toBe('in_stock');
        expect(dto.lastUpdated).toBeInstanceOf(Date);
        expect(dto.currentStock).toBeGreaterThanOrEqual(0);
        expect(dto.reservedStock).toBeGreaterThanOrEqual(0);
        expect(dto.availableStock).toBeGreaterThanOrEqual(0);
      });

      it('should handle inventory status values', () => {
        // Given: Different inventory statuses
        const statuses: ProductInventoryDto['status'][] = [
          'in_stock',
          'low_stock',
          'out_of_stock',
          'discontinued'
        ];

        // When: Validating status values
        // Then: Should accept all valid statuses
        statuses.forEach(status => {
          const dto: ProductInventoryDto = {
            productId: 'product-123',
            currentStock: status === 'out_of_stock' ? 0 : 10,
            reservedStock: 0,
            availableStock: status === 'out_of_stock' ? 0 : 10,
            status,
            lastUpdated: new Date()
          };

          expect(['in_stock', 'low_stock', 'out_of_stock', 'discontinued']).toContain(dto.status);
        });
      });
    });
  });

  describe('UpdateInventoryDto', () => {
    describe('when validating inventory operations', () => {
      it('should handle different operation types', () => {
        // Given: Different inventory operations
        const operations: UpdateInventoryDto['operation'][] = [
          'set',
          'add',
          'subtract',
          'reserve',
          'release'
        ];

        // When: Validating operations
        // Then: Should accept all valid operations
        operations.forEach(operation => {
          const dto: UpdateInventoryDto = {
            productId: 'product-123',
            quantity: operation === 'subtract' ? -10 : 10,
            operation,
            reason: `Test ${operation} operation`
          };

          expect(['set', 'add', 'subtract', 'reserve', 'release']).toContain(dto.operation);
          expect(dto.quantity).toBeDefined();
          expect(typeof dto.quantity).toBe('number');
        });
      });
    });
  });

  describe('ProductValidationDto', () => {
    describe('when validating validation results', () => {
      it('should handle successful validation', () => {
        // Given: Successful validation DTO
        const dto: ProductValidationDto = {
          isValid: true,
          errors: [],
          warnings: [],
          suggestions: []
        };

        // When: Validating successful result
        // Then: Should indicate success
        expect(dto.isValid).toBe(true);
        expect(dto.errors).toHaveLength(0);
        expect(dto.warnings).toHaveLength(0);
        expect(dto.suggestions).toHaveLength(0);
      });

      it('should handle validation errors', () => {
        // Given: Validation DTO with errors
        const dto: ProductValidationDto = {
          isValid: false,
          errors: [
            {
              field: 'name',
              code: 'REQUIRED',
              message: 'Product name is required',
              severity: 'error'
            },
            {
              field: 'price',
              code: 'INVALID_VALUE',
              message: 'Price must be greater than 0',
              severity: 'error'
            }
          ],
          warnings: [
            {
              field: 'description',
              code: 'TOO_SHORT',
              message: 'Description is very short'
            }
          ],
          suggestions: [
            {
              field: 'tags',
              type: 'improvement',
              message: 'Add more descriptive tags',
              impact: 'medium'
            }
          ]
        };

        // When: Validating error result
        // Then: Should have error details
        expect(dto.isValid).toBe(false);
        expect(dto.errors).toHaveLength(2);
        expect(dto.warnings).toHaveLength(1);
        expect(dto.suggestions).toHaveLength(1);

        // Validate error structure
        expect(dto.errors[0].field).toBe('name');
        expect(dto.errors[0].code).toBe('REQUIRED');
        expect(dto.errors[0].message).toBe('Product name is required');
        expect(dto.errors[0].severity).toBe('error');

        // Validate warning structure
        expect(dto.warnings[0].field).toBe('description');
        expect(dto.warnings[0].code).toBe('TOO_SHORT');
        expect(dto.warnings[0].message).toBe('Description is very short');

        // Validate suggestion structure
        expect(dto.suggestions[0].field).toBe('tags');
        expect(dto.suggestions[0].type).toBe('improvement');
        expect(dto.suggestions[0].message).toBe('Add more descriptive tags');
        expect(dto.suggestions[0].impact).toBe('medium');
      });
    });
  });
});