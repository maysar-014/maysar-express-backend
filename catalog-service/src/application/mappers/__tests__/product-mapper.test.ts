/**
 * Product Mapper Tests
 * 
 * Purpose: Validates mapping between DTOs and domain objects
 * Scope: Application layer mapper testing with bidirectional mapping
 * Coverage Target: 85% (mapper logic and transformations)
 * 
 * Test Categories:
 * - DTO to domain entity mapping
 * - Domain entity to DTO mapping
 * - Validation during mapping
 * - Error handling for invalid mappings
 */

import { ProductMapper } from '../product-mapper';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductSummaryDto,
  ProductValidationDto
} from '../product.dto';
import { ProductType } from '../../../domain/value-objects/product-types.value-object';

// Mock domain dependencies
jest.mock('../../domain/entities/product.entity');
jest.mock('../../domain/value-objects/monetary.value-object');
jest.mock('../../domain/value-objects/ids.value-object');

describe('ProductMapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('toEntity', () => {
    describe('when mapping CreateProductDto to Product entity', () => {
      it('should validate required fields before mapping', () => {
        // Given: Invalid DTO with missing seller ID
        const invalidDto = {
          sellerId: '',
          name: 'Test Product',
          description: 'Description',
          price: 99.99,
          categoryId: 'category-456',
          type: ProductType.PHYSICAL,
          tags: [],
          mediaUrls: [],
          inventoryCount: 100,
          attributes: {}
        } as CreateProductDto;

        // When: Mapping invalid DTO
        // Then: Should throw validation error
        expect(() => ProductMapper.toEntity(invalidDto)).toThrow('Seller ID is required');
      });

      it('should validate product name is required', () => {
        // Given: DTO with empty name
        const invalidDto = {
          sellerId: 'seller-123',
          name: '',
          description: 'Description',
          price: 99.99,
          categoryId: 'category-456',
          type: ProductType.PHYSICAL,
          tags: [],
          mediaUrls: [],
          inventoryCount: 100,
          attributes: {}
        } as CreateProductDto;

        // When: Mapping DTO with empty name
        // Then: Should throw validation error
        expect(() => ProductMapper.toEntity(invalidDto)).toThrow('Product name is required');
      });

      it('should validate product description is required', () => {
        // Given: DTO with empty description
        const invalidDto = {
          sellerId: 'seller-123',
          name: 'Product Name',
          description: '',
          price: 99.99,
          categoryId: 'category-456',
          type: ProductType.PHYSICAL,
          tags: [],
          mediaUrls: [],
          inventoryCount: 100,
          attributes: {}
        } as CreateProductDto;

        // When: Mapping DTO with empty description
        // Then: Should throw validation error
        expect(() => ProductMapper.toEntity(invalidDto)).toThrow('Product description is required');
      });

      it('should validate price is positive', () => {
        // Given: DTO with invalid price
        const invalidDto = {
          sellerId: 'seller-123',
          name: 'Product Name',
          description: 'Description',
          price: 0,
          categoryId: 'category-456',
          type: ProductType.PHYSICAL,
          tags: [],
          mediaUrls: [],
          inventoryCount: 100,
          attributes: {}
        } as CreateProductDto;

        // When: Mapping DTO with invalid price
        // Then: Should throw validation error
        expect(() => ProductMapper.toEntity(invalidDto)).toThrow('Valid product price is required');
      });

      it('should validate product type is required', () => {
        // Given: DTO without product type
        const invalidDto = {
          sellerId: 'seller-123',
          name: 'Product Name',
          description: 'Description',
          price: 99.99,
          categoryId: 'category-456',
          type: null,
          tags: [],
          mediaUrls: [],
          inventoryCount: 100,
          attributes: {}
        } as any;

        // When: Mapping DTO without type
        // Then: Should throw validation error
        expect(() => ProductMapper.toEntity(invalidDto)).toThrow('Product type is required');
      });
    });
  });

  describe('toSummaryDto', () => {
    describe('when mapping Product entity to ProductSummaryDto', () => {
      it('should create summary DTO from entity', () => {
        // Given: Mock Product entity
        const mockEntity = {
          getId: jest.fn().mockReturnValue({ toString: () => 'product-123' }),
          getName: jest.fn().mockReturnValue('Test Product'),
          getDefaultVariant: jest.fn().mockReturnValue({
            getPrice: jest.fn().mockReturnValue({
              toNumber: () => 99.99,
              getCurrency: () => 'USD'
            })
          }),
          getCategoryId: jest.fn().mockReturnValue({ toString: () => 'category-456' }),
          getSellerId: jest.fn().mockReturnValue({ toString: () => 'seller-789' }),
          getType: jest.fn().mockReturnValue('physical'),
          getTags: jest.fn().mockReturnValue(['electronics', 'gadget']),
          getStatus: jest.fn().mockReturnValue({ toString: () => 'active' }),
          getImages: jest.fn().mockReturnValue(['https://example.com/image1.jpg']),
          getCreatedAt: jest.fn().mockReturnValue(new Date('2024-01-01'))
        };

        // When: Mapping entity to summary DTO
        const summaryDto = ProductMapper.toSummaryDto(mockEntity as any);

        // Then: Should create correct summary DTO
        expect(summaryDto.id).toBe('product-123');
        expect(summaryDto.name).toBe('Test Product');
        expect(summaryDto.price).toEqual({
          amount: 99.99,
          currency: 'USD'
        });
        expect(summaryDto.categoryId).toBe('category-456');
        expect(summaryDto.sellerId).toBe('seller-789');
        expect(summaryDto.type).toBe('physical');
        expect(summaryDto.tags).toEqual(['electronics', 'gadget']);
        expect(summaryDto.status).toBe('active');
        expect(summaryDto.createdAt).toEqual(new Date('2024-01-01'));
      });

      it('should handle entity with null category', () => {
        // Given: Mock Product entity with null category
        const mockEntity = {
          getId: jest.fn().mockReturnValue({ toString: () => 'product-123' }),
          getName: jest.fn().mockReturnValue('Test Product'),
          getDefaultVariant: jest.fn().mockReturnValue({
            getPrice: jest.fn().mockReturnValue({
              toNumber: () => 99.99,
              getCurrency: () => 'USD'
            })
          }),
          getCategoryId: jest.fn().mockReturnValue(null),
          getSellerId: jest.fn().mockReturnValue({ toString: () => 'seller-789' }),
          getType: jest.fn().mockReturnValue('physical'),
          getTags: jest.fn().mockReturnValue([]),
          getStatus: jest.fn().mockReturnValue({ toString: () => 'active' }),
          getImages: jest.fn().mockReturnValue([]),
          getCreatedAt: jest.fn().mockReturnValue(new Date('2024-01-01'))
        };

        // When: Mapping entity with null category
        const summaryDto = ProductMapper.toSummaryDto(mockEntity as any);

        // Then: Should handle null category gracefully
        expect(summaryDto.categoryId).toBe('');
        expect(summaryDto.tags).toEqual([]);
        expect(summaryDto.thumbnailUrl).toBeUndefined();
      });

      it('should include optional data when provided', () => {
        // Given: Mock entity and options
        const mockEntity = {
          getId: jest.fn().mockReturnValue({ toString: () => 'product-123' }),
          getName: jest.fn().mockReturnValue('Test Product'),
          getDefaultVariant: jest.fn().mockReturnValue({
            getPrice: jest.fn().mockReturnValue({
              toNumber: () => 99.99,
              getCurrency: () => 'USD'
            })
          }),
          getCategoryId: jest.fn().mockReturnValue({ toString: () => 'category-456' }),
          getSellerId: jest.fn().mockReturnValue({ toString: () => 'seller-789' }),
          getType: jest.fn().mockReturnValue('physical'),
          getTags: jest.fn().mockReturnValue(['electronics']),
          getStatus: jest.fn().mockReturnValue({ toString: () => 'active' }),
          getImages: jest.fn().mockReturnValue(['image1.jpg']),
          getCreatedAt: jest.fn().mockReturnValue(new Date('2024-01-01'))
        };

        const options = {
          sellerName: 'Test Seller',
          categoryName: 'Electronics',
          thumbnailUrl: 'thumb.jpg',
          averageRating: 4.5,
          reviewCount: 25
        };

        // When: Mapping with options
        const summaryDto = ProductMapper.toSummaryDto(mockEntity as any, options);

        // Then: Should include optional data
        expect(summaryDto.sellerName).toBe('Test Seller');
        expect(summaryDto.categoryName).toBe('Electronics');
        expect(summaryDto.thumbnailUrl).toBe('thumb.jpg');
        expect(summaryDto.averageRating).toBe(4.5);
        expect(summaryDto.reviewCount).toBe(25);
      });
    });
  });

  describe('toPartialUpdate', () => {
    describe('when mapping UpdateProductDto to partial update', () => {
      it('should validate product ID is required', () => {
        // Given: Update DTO without product ID
        const invalidDto = {
          productId: '',
          name: 'Updated Name'
        } as UpdateProductDto;

        // When: Mapping invalid update DTO
        // Then: Should throw validation error
        expect(() => ProductMapper.toPartialUpdate(invalidDto)).toThrow('Product ID is required');
      });

      it('should validate price is positive when provided', () => {
        // Given: Update DTO with negative price
        const invalidDto = {
          productId: 'product-123',
          price: -10
        } as UpdateProductDto;

        // When: Mapping DTO with invalid price
        // Then: Should throw validation error
        expect(() => ProductMapper.toPartialUpdate(invalidDto)).toThrow('Price must be greater than 0');
      });

      it('should handle partial updates with only some fields', () => {
        // Given: Partial update DTO
        const dto: UpdateProductDto = {
          productId: 'product-123',
          name: 'New Name'
        };

        // When: Mapping partial DTO
        const partialUpdate = ProductMapper.toPartialUpdate(dto);

        // Then: Should only include provided fields
        expect(partialUpdate.name).toBe('New Name');
        expect(partialUpdate.description).toBeUndefined();
        expect(partialUpdate.price).toBeUndefined();
        expect(partialUpdate.categoryId).toBeUndefined();
      });
    });
  });

  describe('toValidationDto', () => {
    describe('when mapping Product entity to validation result', () => {
      it('should create validation DTO for valid entity', () => {
        // Given: Valid Product entity
        const mockEntity = {
          getName: jest.fn().mockReturnValue('Valid Product'),
          getDescription: jest.fn().mockReturnValue('Valid description'),
          getVariants: jest.fn().mockReturnValue([{ id: 'variant-1' }]),
          getImages: jest.fn().mockReturnValue(['image1.jpg'])
        };

        // When: Mapping entity to validation DTO
        const validationDto = ProductMapper.toValidationDto(mockEntity as any);

        // Then: Should indicate valid entity
        expect(validationDto.isValid).toBe(true);
        expect(validationDto.errors).toHaveLength(0);
        expect(validationDto.warnings).toHaveLength(0);
        expect(validationDto.suggestions).toHaveLength(0);
      });

      it('should create validation DTO for entity with missing name', () => {
        // Given: Entity with empty name
        const mockEntity = {
          getName: jest.fn().mockReturnValue(''),
          getDescription: jest.fn().mockReturnValue('Valid description'),
          getVariants: jest.fn().mockReturnValue([{ id: 'variant-1' }]),
          getImages: jest.fn().mockReturnValue(['image1.jpg'])
        };

        // When: Mapping invalid entity
        const validationDto = ProductMapper.toValidationDto(mockEntity as any);

        // Then: Should indicate validation error
        expect(validationDto.isValid).toBe(false);
        expect(validationDto.errors).toHaveLength(1);
        expect(validationDto.errors[0]).toEqual({
          field: 'name',
          code: 'REQUIRED',
          message: 'Product name is required',
          severity: 'error'
        });
      });

      it('should create validation DTO for entity with missing description', () => {
        // Given: Entity with empty description
        const mockEntity = {
          getName: jest.fn().mockReturnValue('Valid Product'),
          getDescription: jest.fn().mockReturnValue(''),
          getVariants: jest.fn().mockReturnValue([{ id: 'variant-1' }]),
          getImages: jest.fn().mockReturnValue(['image1.jpg'])
        };

        // When: Mapping entity with empty description
        const validationDto = ProductMapper.toValidationDto(mockEntity as any);

        // Then: Should indicate validation error
        expect(validationDto.isValid).toBe(false);
        expect(validationDto.errors).toHaveLength(1);
        expect(validationDto.errors[0]).toEqual({
          field: 'description',
          code: 'REQUIRED',
          message: 'Product description is required',
          severity: 'error'
        });
      });

      it('should create validation DTO for entity without variants', () => {
        // Given: Entity without variants
        const mockEntity = {
          getName: jest.fn().mockReturnValue('Valid Product'),
          getDescription: jest.fn().mockReturnValue('Valid description'),
          getVariants: jest.fn().mockReturnValue([]),
          getImages: jest.fn().mockReturnValue(['image1.jpg'])
        };

        // When: Mapping entity without variants
        const validationDto = ProductMapper.toValidationDto(mockEntity as any);

        // Then: Should indicate validation error
        expect(validationDto.isValid).toBe(false);
        expect(validationDto.errors).toHaveLength(1);
        expect(validationDto.errors[0]).toEqual({
          field: 'variants',
          code: 'REQUIRED',
          message: 'Product must have at least one variant',
          severity: 'error'
        });
      });

      it('should create validation DTO for entity without images', () => {
        // Given: Entity without images
        const mockEntity = {
          getName: jest.fn().mockReturnValue('Valid Product'),
          getDescription: jest.fn().mockReturnValue('Valid description'),
          getVariants: jest.fn().mockReturnValue([{ id: 'variant-1' }]),
          getImages: jest.fn().mockReturnValue([])
        };

        // When: Mapping entity without images
        const validationDto = ProductMapper.toValidationDto(mockEntity as any);

        // Then: Should indicate warning
        expect(validationDto.isValid).toBe(true);
        expect(validationDto.errors).toHaveLength(0);
        expect(validationDto.warnings).toHaveLength(1);
        expect(validationDto.warnings[0]).toEqual({
          field: 'images',
          message: 'Product has no images'
        });
      });

      it('should use provided validation result when given', () => {
        // Given: Entity and custom validation result
        const mockEntity = {};
        const customValidation = {
          isValid: false,
          errors: [
            {
              field: 'custom',
              code: 'CUSTOM_ERROR',
              message: 'Custom validation error',
              severity: 'error' as const
            }
          ],
          warnings: [
            {
              field: 'custom',
              message: 'Custom warning'
            }
          ],
          suggestions: [
            {
              field: 'custom',
              type: 'improvement',
              message: 'Custom suggestion',
              impact: 'high' as const
            }
          ]
        };

        // When: Mapping with custom validation
        const validationDto = ProductMapper.toValidationDto(mockEntity as any, customValidation);

        // Then: Should use provided validation result
        expect(validationDto).toEqual(customValidation);
      });
    });
  });

  describe('Batch Operations', () => {
    describe('toSummaryDtoBatch', () => {
      it('should map multiple entities to summary DTOs', () => {
        // Given: Multiple Product entities
        const mockEntities = [
          {
            getId: jest.fn().mockReturnValue({ toString: () => 'product-1' }),
            getName: jest.fn().mockReturnValue('Product 1'),
            getDefaultVariant: jest.fn().mockReturnValue({
              getPrice: jest.fn().mockReturnValue({
                toNumber: () => 99.99,
                getCurrency: () => 'USD'
              })
            }),
            getCategoryId: jest.fn().mockReturnValue({ toString: () => 'category-1' }),
            getSellerId: jest.fn().mockReturnValue({ toString: () => 'seller-1' }),
            getType: jest.fn().mockReturnValue('physical'),
            getTags: jest.fn().mockReturnValue(['tag1']),
            getStatus: jest.fn().mockReturnValue({ toString: () => 'active' }),
            getImages: jest.fn().mockReturnValue(['image1.jpg']),
            getCreatedAt: jest.fn().mockReturnValue(new Date('2024-01-01'))
          },
          {
            getId: jest.fn().mockReturnValue({ toString: () => 'product-2' }),
            getName: jest.fn().mockReturnValue('Product 2'),
            getDefaultVariant: jest.fn().mockReturnValue({
              getPrice: jest.fn().mockReturnValue({
                toNumber: () => 149.99,
                getCurrency: () => 'USD'
              })
            }),
            getCategoryId: jest.fn().mockReturnValue({ toString: () => 'category-2' }),
            getSellerId: jest.fn().mockReturnValue({ toString: () => 'seller-2' }),
            getType: jest.fn().mockReturnValue('digital'),
            getTags: jest.fn().mockReturnValue(['tag2']),
            getStatus: jest.fn().mockReturnValue({ toString: () => 'published' }),
            getImages: jest.fn().mockReturnValue(['image2.jpg']),
            getCreatedAt: jest.fn().mockReturnValue(new Date('2024-01-02'))
          }
        ];

        // When: Mapping entities to summary DTOs in batch
        const summaryDtos = ProductMapper.toSummaryDtoBatch(mockEntities as any);

        // Then: Should create summary DTOs for all entities
        expect(summaryDtos).toHaveLength(2);
        expect(summaryDtos[0].id).toBe('product-1');
        expect(summaryDtos[0].name).toBe('Product 1');
        expect(summaryDtos[0].price.amount).toBe(99.99);
        expect(summaryDtos[1].id).toBe('product-2');
        expect(summaryDtos[1].name).toBe('Product 2');
        expect(summaryDtos[1].price.amount).toBe(149.99);
      });

      it('should handle empty entity array', () => {
        // Given: Empty entity array
        const mockEntities: any[] = [];

        // When: Mapping empty array
        const summaryDtos = ProductMapper.toSummaryDtoBatch(mockEntities);

        // Then: Should return empty array
        expect(summaryDtos).toEqual([]);
      });
    });
  });

  describe('Edge Cases', () => {
    describe('when handling edge cases', () => {
      it('should handle whitespace in validation', () => {
        // Given: DTO with whitespace-only name
        const invalidDto = {
          sellerId: 'seller-123',
          name: '   ',
          description: 'Description',
          price: 99.99,
          categoryId: 'category-456',
          type: ProductType.PHYSICAL,
          tags: [],
          mediaUrls: [],
          inventoryCount: 100,
          attributes: {}
        } as CreateProductDto;

        // When: Mapping DTO with whitespace name
        // Then: Should throw validation error
        expect(() => ProductMapper.toEntity(invalidDto)).toThrow('Product name is required');
      });

      it('should handle zero price validation', () => {
        // Given: DTO with zero price
        const invalidDto = {
          sellerId: 'seller-123',
          name: 'Product Name',
          description: 'Description',
          price: 0,
          categoryId: 'category-456',
          type: ProductType.PHYSICAL,
          tags: [],
          mediaUrls: [],
          inventoryCount: 100,
          attributes: {}
        } as CreateProductDto;

        // When: Mapping DTO with zero price
        // Then: Should throw validation error
        expect(() => ProductMapper.toEntity(invalidDto)).toThrow('Valid product price is required');
      });

      it('should handle negative price in update validation', () => {
        // Given: Update DTO with negative price
        const invalidDto = {
          productId: 'product-123',
          price: -50
        } as UpdateProductDto;

        // When: Mapping update DTO with negative price
        // Then: Should throw validation error
        expect(() => ProductMapper.toPartialUpdate(invalidDto)).toThrow('Price must be greater than 0');
      });
    });
  });
});