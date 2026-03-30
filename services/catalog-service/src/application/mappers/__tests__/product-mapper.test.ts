/**
 * Product Mapper Test Suite
 * Tests for product data mapping between different layers
 */

import { ProductMapper } from '../product-mapper';
import { Product } from '../../../domain/entities/product.entity';
import { Price } from '../../../domain/value-objects/monetary.value-object';
import { CreateProductDto } from '../../dto/product.dto';
import { ProductType } from '../../../domain/value-objects/product-types.value-object';

type LegacyMedia = {
  images?: string[];
  videos?: string[];
  documents?: string[];
};

type LegacyInventory = {
  quantity?: number;
  reserved?: number;
  available?: number;
  status?: string;
  lowStockThreshold?: number;
};

type LegacyShipping = {
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit?: string;
  };
};

function createLegacyProduct(
  id: string,
  name: string,
  description: string,
  categoryId: string,
  sku: string,
  price: {
    amount: number;
    currency: string;
    originalPrice?: number;
    discountPercentage?: number;
  },
  inventory: LegacyInventory,
  media: LegacyMedia = {},
  attributes: Record<string, unknown> = {},
  tags: string[] = [],
  status = 'draft',
  visibility: 'public' | 'private' | 'draft' = 'private',
  createdAt: Date = new Date(),
  updatedAt: Date = createdAt,
  publishedAt?: Date,
  shipping?: LegacyShipping
): Product {
  const totalInventory = inventory.quantity ?? inventory.available ?? 0;
  const variantPrice = new Price(price.amount, price.currency);
  const compareAtPrice = price.originalPrice !== undefined ? new Price(price.originalPrice, price.currency) : undefined;
  const productVisibility = visibility === 'draft' ? 'private' : visibility;
  const sellerId = id.startsWith('product-') ? `seller-${id.slice('product-'.length)}` : `seller-${id}`;
  const variant = {
    getId: () => `${id}-variant`,
    getSku: () => sku,
    getName: () => name,
    getPrice: () => variantPrice,
    getCompareAtPrice: () => compareAtPrice,
    getCostPrice: () => undefined,
    getInventoryQuantity: () => totalInventory,
    getAttributes: () => ({ ...attributes }),
    isInStock: () => totalInventory > 0,
    isOnSale: () => compareAtPrice !== undefined && variantPrice.toNumber() < compareAtPrice.toNumber(),
    calculateMargin: () => null
  };
  const statusValue = {
    toString: () => status,
    isPublished: () => status === 'published',
    isActive: () => status === 'active' || status === 'published',
    canTransitionTo: () => true
  };
  const shippingInfo = shipping
    ? {
        getWeight: () => (shipping.weight !== undefined ? { getValue: () => shipping.weight, getUnit: () => 'kg' } : undefined),
        getDimensions: () =>
          shipping.dimensions
            ? {
                getLength: () => shipping.dimensions!.length,
                getWidth: () => shipping.dimensions!.width,
                getHeight: () => shipping.dimensions!.height,
                getUnit: () => shipping.dimensions!.unit || 'cm'
              }
            : undefined,
        needsSpecialShipping: () => false
      }
    : undefined;

  return {
    getId: () => ({ toString: () => id }),
    getSellerId: () => ({ toString: () => sellerId }),
    getName: () => name,
    getDescription: () => description,
    getStatus: () => statusValue,
    getType: () => ProductType.PHYSICAL.toUpperCase(),
    getVisibility: () => productVisibility,
    getCategoryId: () => ({ toString: () => categoryId }),
    getVariants: () => [variant],
    getDefaultVariant: () => variant,
    getImages: () => [...(media.images || [])],
    getTags: () => [...tags],
    getSeoData: () => undefined,
    getShippingInfo: () => shippingInfo,
    getCreatedAt: () => createdAt,
    getUpdatedAt: () => updatedAt,
    getEnablerEnabled: () => false,
    getEnablerCommissionRate: () => undefined,
    getTotalInventory: () => totalInventory,
    isInStock: () => totalInventory > 0,
    isPublished: () => status === 'published',
    getPublishedAt: () => publishedAt
  } as unknown as Product;
}

describe('ProductMapper', () => {
  describe('toEntity', () => {
    it('should map CreateProductDto to Product entity', () => {
      const dto: CreateProductDto = {
        sellerId: 'seller-123',
        name: 'Test Product',
        description: 'A test product',
        price: 99.99,
        currency: 'USD',
        categoryId: 'category-123',
        type: ProductType.PHYSICAL,
        tags: ['test', 'product'],
        mediaUrls: ['image1.jpg', 'image2.jpg'],
        inventoryCount: 100,
        attributes: {
          color: 'red',
          size: 'M'
        },
        seoTitle: 'Test Product SEO Title',
        seoDescription: 'Test Product SEO Description'
      };

      const product = ProductMapper.toEntity(dto);

      expect(product).toBeInstanceOf(Product);
      expect(product.getName()).toBe('Test Product');
      expect(product.getDescription()).toBe('A test product');
      expect(product.getTags()).toEqual(['test', 'product']);
      expect(product.getImages()).toEqual(['image1.jpg', 'image2.jpg']);
      expect(product.getVariants()).toHaveLength(1);
      
      const defaultVariant = product.getDefaultVariant();
      expect(defaultVariant).toBeDefined();
      expect(defaultVariant.getPrice().toNumber()).toBe(99.99);
      expect(defaultVariant.getPrice().getCurrency()).toBe('USD');
      expect(defaultVariant.getInventoryQuantity()).toBe(100);
    });

    it('should handle minimal CreateProductDto', () => {
      const dto: CreateProductDto = {
        sellerId: 'seller-minimal',
        name: 'Minimal Product',
        description: 'A minimal product',
        price: 10.00,
        categoryId: 'category-minimal',
        type: ProductType.DIGITAL,
        tags: [],
        mediaUrls: [],
        inventoryCount: 50,
        attributes: {}
      };

      const product = ProductMapper.toEntity(dto);

      expect(product.getName()).toBe('Minimal Product');
      expect(product.getDescription()).toBe('A minimal product');
      expect(product.getTags()).toEqual([]);
      expect(product.getImages()).toEqual([]);
      expect(product.getVariants()).toHaveLength(1);
      
      const defaultVariant = product.getDefaultVariant();
      expect(defaultVariant.getPrice().toNumber()).toBe(10.00);
      expect(defaultVariant.getInventoryQuantity()).toBe(50);
    });

    it('should handle optional currency', () => {
      const dto: CreateProductDto = {
        sellerId: 'seller-currency',
        name: 'Currency Product',
        description: 'A product with default currency',
        price: 25.00,
        categoryId: 'category-currency',
        type: ProductType.PHYSICAL,
        tags: ['currency'],
        mediaUrls: [],
        inventoryCount: 75,
        attributes: {}
      };

      const product = ProductMapper.toEntity(dto);

      const defaultVariant = product.getDefaultVariant();
      expect(defaultVariant.getPrice().getCurrency()).toBe('USD'); // Default currency
    });

    it('should throw error for invalid DTO', () => {
      const invalidDTO = {
        // Missing required fields
      } as unknown as CreateProductDto;

      expect(() => {
        ProductMapper.toEntity(invalidDTO);
      }).toThrow('Seller ID is required');
    });

    it('should throw error for missing name', () => {
      const dto: CreateProductDto = {
        sellerId: 'seller-invalid',
        name: '',
        description: 'A product',
        price: 10.00,
        categoryId: 'category-invalid',
        type: ProductType.PHYSICAL,
        tags: [],
        mediaUrls: [],
        inventoryCount: 10,
        attributes: {}
      };

      expect(() => {
        ProductMapper.toEntity(dto);
      }).toThrow('Product name is required');
    });

    it('should throw error for invalid price', () => {
      const dto: CreateProductDto = {
        sellerId: 'seller-invalid',
        name: 'Invalid Price Product',
        description: 'A product',
        price: -10.00,
        categoryId: 'category-invalid',
        type: ProductType.PHYSICAL,
        tags: [],
        mediaUrls: [],
        inventoryCount: 10,
        attributes: {}
      };

      expect(() => {
        ProductMapper.toEntity(dto);
      }).toThrow('Valid product price is required');
    });
  });

  describe('toSummaryDto', () => {
    it('should map Product entity to summary DTO', () => {
      const product = createLegacyProduct(
        'product-123',
        'Test Product',
        'A test product',
        'category-123',
        'TEST-001',
        {
          amount: 75.00,
          currency: 'USD'
        },
        {
          quantity: 50,
          status: 'in_stock'
        },
        {
          images: ['summary.jpg']
        },
        {
          color: 'blue'
        },
        ['summary', 'product'],
        'active',
        'public',
        new Date('2023-01-01'),
        new Date('2023-01-02'),
        new Date('2023-01-03')
      );

      const summaryDTO = ProductMapper.toSummaryDto(product, {
        sellerName: 'Test Seller',
        categoryName: 'Test Category',
        thumbnailUrl: 'summary.jpg',
        averageRating: 4.5,
        reviewCount: 120
      });

      expect(summaryDTO.id).toBe('product-123');
      expect(summaryDTO.name).toBe('Test Product');
      expect(summaryDTO.price).toEqual({
        amount: 75.00,
        currency: 'USD'
      });
      expect(summaryDTO.categoryId).toBe('category-123');
      expect(summaryDTO.categoryName).toBe('Test Category');
      expect(summaryDTO.sellerId).toBe('seller-123');
      expect(summaryDTO.sellerName).toBe('Test Seller');
      expect(summaryDTO.type).toBe(ProductType.PHYSICAL.toUpperCase());
      expect(summaryDTO.tags).toEqual(['summary', 'product']);
      expect(summaryDTO.status).toBe('active');
      expect(summaryDTO.thumbnailUrl).toBe('summary.jpg');
      expect(summaryDTO.averageRating).toBe(4.5);
      expect(summaryDTO.reviewCount).toBe(120);
      expect(summaryDTO.createdAt).toEqual(new Date('2023-01-01'));
    });

    it('should handle minimal Product entity for summary', () => {
      const product = createLegacyProduct(
        'product-minimal-summary',
        'Minimal Summary Product',
        'Minimal summary description',
        'category-minimal-summary',
        'MIN-SUM-001',
        {
          amount: 15.00,
          currency: 'USD'
        },
        {
          quantity: 0,
          status: 'out_of_stock'
        }
      );

      const summaryDTO = ProductMapper.toSummaryDto(product);

      expect(summaryDTO.id).toBe('product-minimal-summary');
      expect(summaryDTO.name).toBe('Minimal Summary Product');
      expect(summaryDTO.price).toEqual({
        amount: 15.00,
        currency: 'USD'
      });
      expect(summaryDTO.categoryId).toBe('category-minimal-summary');
      expect(summaryDTO.tags).toEqual([]);
      expect(summaryDTO.status).toBe('draft');
      expect(summaryDTO.thumbnailUrl).toBeUndefined();
      expect(summaryDTO.averageRating).toBeUndefined();
      expect(summaryDTO.reviewCount).toBeUndefined();
      expect(summaryDTO.createdAt).toBeInstanceOf(Date);
    });

    it('should handle no images for thumbnail', () => {
      const product = createLegacyProduct(
        'product-no-images',
        'No Images Product',
        'No images description',
        'category-no-images',
        'NO-IMG-001',
        {
          amount: 25.00,
          currency: 'USD'
        },
        {
          quantity: 10,
          status: 'in_stock'
        },
        {
          images: [],
          videos: ['video.mp4']
        }
      );

      const summaryDTO = ProductMapper.toSummaryDto(product);

      expect(summaryDTO.thumbnailUrl).toBeUndefined();
    });

    it('should handle multiple images and use first as thumbnail', () => {
      const product = createLegacyProduct(
        'product-multiple-images',
        'Multiple Images Product',
        'Multiple images description',
        'category-multiple-images',
        'MULTI-IMG-001',
        {
          amount: 30.00,
          currency: 'USD'
        },
        {
          quantity: 20,
          status: 'in_stock'
        },
        {
          images: ['first.jpg', 'second.jpg', 'third.jpg']
        }
      );

      const summaryDTO = ProductMapper.toSummaryDto(product);

      expect(summaryDTO.thumbnailUrl).toBe('first.jpg');
    });
  });

  describe('toDetailsDto', () => {
    it('should map Product entity to details DTO', () => {
      const product = createLegacyProduct(
        'product-details',
        'Details Product',
        'Details description',
        'category-details',
        'DET-001',
        {
          amount: 99.99,
          currency: 'USD',
          originalPrice: 129.99,
          discountPercentage: 23.08
        },
        {
          quantity: 100,
          reserved: 5,
          available: 95,
          lowStockThreshold: 10,
          status: 'in_stock'
        },
        {
          images: ['details1.jpg', 'details2.jpg'],
          videos: ['details.mp4']
        },
        {
          color: 'black',
          storage: '128GB',
          ram: '8GB'
        },
        ['details', 'product'],
        'active',
        'public',
        new Date('2023-01-01'),
        new Date('2023-01-02'),
        new Date('2023-01-03'),
        {
          weight: 1.5,
          dimensions: {
            length: 10,
            width: 5,
            height: 3
          }
        }
      );

      const detailsDTO = ProductMapper.toDetailsDto(product, {
        sellerName: 'Details Seller',
        categoryName: 'Details Category',
        categoryPath: ['Electronics', 'Phones', 'Smartphones'],
        reviews: [],
        recommendations: [],
        analytics: {
          viewCount: 1000,
          purchaseCount: 50,
          favoriteCount: 25,
          shareCount: 10
        },
        ratings: {
          average: 4.2,
          count: 150,
          distribution: { 1: 5, 2: 10, 3: 20, 4: 60, 5: 55 }
        }
      });

      expect(detailsDTO.id).toBe('product-details');
      expect(detailsDTO.sellerId).toBe('seller-details');
      expect(detailsDTO.sellerName).toBe('Details Seller');
      expect(detailsDTO.name).toBe('Details Product');
      expect(detailsDTO.description).toBe('Details description');
      expect(detailsDTO.price).toEqual({
        amount: 99.99,
        currency: 'USD',
        originalPrice: 129.99,
        discountPercentage: 23.08
      });
      expect(detailsDTO.categoryId).toBe('category-details');
      expect(detailsDTO.categoryName).toBe('Details Category');
      expect(detailsDTO.categoryPath).toEqual(['Electronics', 'Phones', 'Smartphones']);
      expect(detailsDTO.type).toBe('PHYSICAL');
      expect(detailsDTO.tags).toEqual(['details', 'product']);
      expect(detailsDTO.status).toBe('active');
      expect(detailsDTO.visibility).toBe('public');
      expect(detailsDTO.media).toHaveLength(2);
      expect(detailsDTO.inventory).toEqual({
        available: 100,
        reserved: 0,
        total: 100,
        status: 'in_stock',
        lowStockThreshold: 5
      });
      expect(detailsDTO.shipping).toBeDefined();
      expect(detailsDTO.seo).toBeDefined();
      expect(detailsDTO.analytics).toBeDefined();
      expect(detailsDTO.ratings).toBeDefined();
      expect(detailsDTO.reviews).toEqual([]);
      expect(detailsDTO.recommendations).toEqual([]);
      expect(detailsDTO.createdAt).toEqual(new Date('2023-01-01'));
      expect(detailsDTO.updatedAt).toEqual(new Date('2023-01-02'));
      expect(detailsDTO.publishedAt).toEqual(new Date('2023-01-03'));
    });

    it('should handle minimal Product entity for details', () => {
      const product = createLegacyProduct(
        'product-minimal-details',
        'Minimal Details Product',
        'Minimal details description',
        'category-minimal-details',
        'MIN-DET-001',
        {
          amount: 20.00,
          currency: 'USD'
        },
        {
          quantity: 0,
          status: 'out_of_stock'
        }
      );

      const detailsDTO = ProductMapper.toDetailsDto(product);

      expect(detailsDTO.id).toBe('product-minimal-details');
      expect(detailsDTO.name).toBe('Minimal Details Product');
      expect(detailsDTO.description).toBe('Minimal details description');
      expect(detailsDTO.price).toEqual({
        amount: 20.00,
        currency: 'USD'
      });
      expect(detailsDTO.categoryId).toBe('category-minimal-details');
      expect(detailsDTO.tags).toEqual([]);
      expect(detailsDTO.status).toBe('draft');
      expect(detailsDTO.visibility).toBe('private');
      expect(detailsDTO.media).toEqual([]);
      expect(detailsDTO.inventory).toEqual({
        available: 0,
        reserved: 0,
        total: 0,
        status: 'out_of_stock',
        lowStockThreshold: 5
      });
      expect(detailsDTO.createdAt).toBeInstanceOf(Date);
      expect(detailsDTO.updatedAt).toBeInstanceOf(Date);
      expect(detailsDTO.publishedAt).toBeUndefined();
    });

    it('should handle media mapping correctly', () => {
      const product = createLegacyProduct(
        'product-media',
        'Media Product',
        'Media description',
        'category-media',
        'MEDIA-001',
        {
          amount: 40.00,
          currency: 'USD'
        },
        {
          quantity: 30,
          status: 'in_stock'
        },
        {
          images: ['img1.jpg', 'img2.jpg'],
          videos: ['vid1.mp4'],
          documents: ['doc1.pdf']
        }
      );

      const detailsDTO = ProductMapper.toDetailsDto(product);

      expect(detailsDTO.media).toHaveLength(2);
      expect(detailsDTO.media[0]).toEqual({
        id: expect.any(String),
        url: 'img1.jpg',
        type: 'image',
        altText: 'Media Product image 1',
        order: 0,
        isPrimary: true
      });
      expect(detailsDTO.media[1]).toEqual({
        id: expect.any(String),
        url: 'img2.jpg',
        type: 'image',
        altText: 'Media Product image 2',
        order: 1,
        isPrimary: false
      });
    });

    it('should handle empty media', () => {
      const product = createLegacyProduct(
        'product-empty-media',
        'Empty Media Product',
        'Empty media description',
        'category-empty-media',
        'EMPTY-MEDIA-001',
        {
          amount: 25.00,
          currency: 'USD'
        },
        {
          quantity: 15,
          status: 'in_stock'
        },
        {
          images: [],
          videos: [],
          documents: []
        }
      );

      const detailsDTO = ProductMapper.toDetailsDto(product);

      expect(detailsDTO.media).toEqual([]);
    });
  });

  describe('toUpdateDto', () => {
    it('should map Product entity to update DTO', () => {
      const product = createLegacyProduct(
        'product-update',
        'Update Product',
        'Update description',
        'category-update',
        'UPDATE-001',
        {
          amount: 79.99,
          currency: 'EUR',
          originalPrice: 99.99
        },
        {
          quantity: 150,
          reserved: 10,
          lowStockThreshold: 15
        },
        {
          images: ['update.jpg'],
          videos: ['update.mp4']
        },
        {
          color: 'purple',
          size: 'XL'
        },
        ['update', 'product'],
        'active',
        'public'
      );

      const updateDTO = ProductMapper.toUpdateDto(product);

      expect(updateDTO.productId).toBe('product-update');
      expect(updateDTO.name).toBe('Update Product');
      expect(updateDTO.description).toBe('Update description');
      expect(updateDTO.price).toBe(79.99);
      expect(updateDTO.currency).toBe('EUR');
      expect(updateDTO.categoryId).toBe('category-update');
      expect(updateDTO.tags).toEqual(['update', 'product']);
      expect(updateDTO.seoTitle).toBeUndefined();
      expect(updateDTO.seoDescription).toBeUndefined();
    });

    it('should handle minimal Product entity for update', () => {
      const product = createLegacyProduct(
        'product-minimal-update',
        'Minimal Update Product',
        'Minimal update description',
        'category-minimal-update',
        'MIN-UPDATE-001',
        {
          amount: 12.00,
          currency: 'USD'
        },
        {
          quantity: 40
        }
      );

      const updateDTO = ProductMapper.toUpdateDto(product);

      expect(updateDTO.productId).toBe('product-minimal-update');
      expect(updateDTO.name).toBe('Minimal Update Product');
      expect(updateDTO.description).toBe('Minimal update description');
      expect(updateDTO.price).toBe(12.00);
      expect(updateDTO.currency).toBe('USD');
      expect(updateDTO.categoryId).toBe('category-minimal-update');
      expect(updateDTO.tags).toEqual([]);
      expect(updateDTO.seoTitle).toBeUndefined();
      expect(updateDTO.seoDescription).toBeUndefined();
    });

    it('should handle empty media for update DTO', () => {
      const product = createLegacyProduct(
        'product-empty-update',
        'Empty Update Product',
        'Empty update description',
        'category-empty-update',
        'EMPTY-UPDATE-001',
        {
          amount: 45.00,
          currency: 'USD'
        },
        {
          quantity: 35
        },
        {
          images: [],
          videos: [],
          documents: []
        }
      );

      const updateDTO = ProductMapper.toUpdateDto(product);

      expect(updateDTO.mediaUrls).toBeUndefined();
    });
  });

  describe('toValidationDto', () => {
    it('should map Product entity to validation DTO with validation results', () => {
      const product = createLegacyProduct(
        'product-validation',
        'Validation Product',
        'Validation description',
        'category-validation',
        'VALID-001',
        {
          amount: 50.00,
          currency: 'USD'
        },
        {
          quantity: 20
        }
      );

      const validationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: []
      };

      const validationDTO = ProductMapper.toValidationDto(product, validationResult);

      expect(validationDTO.isValid).toBe(true);
      expect(validationDTO.errors).toEqual([]);
      expect(validationDTO.warnings).toEqual([]);
      expect(validationDTO.suggestions).toEqual([]);
    });

    it('should perform basic validation when no validation result provided', () => {
      const product = createLegacyProduct(
        'product-basic-validation',
        '', // Empty name
        '', // Empty description
        'category-validation',
        'VALID-001',
        {
          amount: 50.00,
          currency: 'USD'
        },
        {
          quantity: 20
        }
      );

      const validationDTO = ProductMapper.toValidationDto(product);

      expect(validationDTO.isValid).toBe(false);
      expect(validationDTO.errors).toHaveLength(2);
      expect(validationDTO.errors[0].field).toBe('name');
      expect(validationDTO.errors[0].code).toBe('REQUIRED');
      expect(validationDTO.errors[0].message).toBe('Product name is required');
      expect(validationDTO.errors[1].field).toBe('description');
      expect(validationDTO.errors[1].code).toBe('REQUIRED');
      expect(validationDTO.errors[1].message).toBe('Product description is required');
    });

    it('should include warnings for missing images', () => {
      const product = createLegacyProduct(
        'product-no-images',
        'No Images Product',
        'Product with no images',
        'category-no-images',
        'NO-IMG-001',
        {
          amount: 30.00,
          currency: 'USD'
        },
        {
          quantity: 10
        }
      );

      const validationDTO = ProductMapper.toValidationDto(product);

      expect(validationDTO.warnings).toHaveLength(1);
      expect(validationDTO.warnings[0].field).toBe('images');
      expect(validationDTO.warnings[0].message).toBe('Product has no images');
    });
  });

  describe('toSummaryDtoBatch', () => {
    it('should map multiple Product entities to summary DTOs with options', () => {
      const products = [
        createLegacyProduct(
          'product-1',
          'Product 1',
          'Description 1',
          'category-1',
          'SKU-1',
          { amount: 10.00, currency: 'USD' },
          { quantity: 5 }
        ),
        createLegacyProduct(
          'product-2',
          'Product 2',
          'Description 2',
          'category-2',
          'SKU-2',
          { amount: 20.00, currency: 'USD' },
          { quantity: 10 }
        )
      ];

      const options = {
        sellerNames: new Map([
          ['seller-1', 'Seller 1'],
          ['seller-2', 'Seller 2']
        ]),
        categoryNames: new Map([
          ['category-1', 'Category 1'],
          ['category-2', 'Category 2']
        ]),
        thumbnailUrls: new Map([
          ['product-1', 'thumb1.jpg'],
          ['product-2', 'thumb2.jpg']
        ]),
        ratings: new Map([
          ['product-1', { average: 4.5, count: 10 }],
          ['product-2', { average: 3.8, count: 15 }]
        ])
      };

      const summaryDTOs = ProductMapper.toSummaryDtoBatch(products, options);

      expect(summaryDTOs).toHaveLength(2);
      expect(summaryDTOs[0].sellerName).toBe('Seller 1');
      expect(summaryDTOs[0].categoryName).toBe('Category 1');
      expect(summaryDTOs[0].thumbnailUrl).toBe('thumb1.jpg');
      expect(summaryDTOs[0].averageRating).toBe(4.5);
      expect(summaryDTOs[0].reviewCount).toBe(10);

      expect(summaryDTOs[1].sellerName).toBe('Seller 2');
      expect(summaryDTOs[1].categoryName).toBe('Category 2');
      expect(summaryDTOs[1].thumbnailUrl).toBe('thumb2.jpg');
      expect(summaryDTOs[1].averageRating).toBe(3.8);
      expect(summaryDTOs[1].reviewCount).toBe(15);
    });

    it('should handle batch mapping without options', () => {
      const products = [
        createLegacyProduct(
          'product-1',
          'Product 1',
          'Description 1',
          'category-1',
          'SKU-1',
          { amount: 10.00, currency: 'USD' },
          { quantity: 5 }
        ),
        createLegacyProduct(
          'product-2',
          'Product 2',
          'Description 2',
          'category-2',
          'SKU-2',
          { amount: 20.00, currency: 'USD' },
          { quantity: 10 }
        )
      ];

      const summaryDTOs = ProductMapper.toSummaryDtoBatch(products);

      expect(summaryDTOs).toHaveLength(2);
      expect(summaryDTOs[0].sellerName).toBeUndefined();
      expect(summaryDTOs[0].categoryName).toBeUndefined();
      expect(summaryDTOs[0].thumbnailUrl).toBeUndefined();
      expect(summaryDTOs[0].averageRating).toBeUndefined();
      expect(summaryDTOs[0].reviewCount).toBeUndefined();

      expect(summaryDTOs[1].sellerName).toBeUndefined();
      expect(summaryDTOs[1].categoryName).toBeUndefined();
      expect(summaryDTOs[1].thumbnailUrl).toBeUndefined();
      expect(summaryDTOs[1].averageRating).toBeUndefined();
      expect(summaryDTOs[1].reviewCount).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should handle null DTO gracefully', () => {
      expect(() => {
        ProductMapper.toEntity(null as unknown as CreateProductDto);
      }).toThrow('Seller ID is required');
    });

    it('should handle undefined DTO gracefully', () => {
      expect(() => {
        ProductMapper.toEntity(undefined as unknown as CreateProductDto);
      }).toThrow('Seller ID is required');
    });

    it('should handle invalid product entity for summary mapping', () => {
      const invalidProduct = {
        // Invalid product structure
      } as unknown as Product;

      expect(() => {
        ProductMapper.toSummaryDto(invalidProduct);
      }).toThrow();
    });

    it('should handle invalid product entity for details mapping', () => {
      const invalidProduct = {
        // Invalid product structure
      } as unknown as Product;

      expect(() => {
        ProductMapper.toDetailsDto(invalidProduct);
      }).toThrow();
    });
  });

  describe('data integrity', () => {
    it('should preserve data integrity in entity creation', () => {
      const dto: CreateProductDto = {
        sellerId: 'seller-integrity',
        name: 'Integrity Product',
        description: 'Integrity description',
        price: 99.99,
        currency: 'USD',
        categoryId: 'category-integrity',
        type: ProductType.PHYSICAL,
        tags: ['integrity', 'product'],
        mediaUrls: ['integrity.jpg'],
        inventoryCount: 100,
        attributes: {
          color: 'blue',
          size: 'M'
        },
        seoTitle: 'Integrity SEO Title',
        seoDescription: 'Integrity SEO Description'
      };

      const product = ProductMapper.toEntity(dto);

      expect(product.getName()).toBe('Integrity Product');
      expect(product.getDescription()).toBe('Integrity description');
      expect(product.getTags()).toEqual(['integrity', 'product']);
      expect(product.getImages()).toEqual(['integrity.jpg']);
      
      const defaultVariant = product.getDefaultVariant();
      expect(defaultVariant.getPrice().toNumber()).toBe(99.99);
      expect(defaultVariant.getPrice().getCurrency()).toBe('USD');
      expect(defaultVariant.getInventoryQuantity()).toBe(100);
    });

    it('should handle currency mapping correctly', () => {
      const dto: CreateProductDto = {
        sellerId: 'seller-currency',
        name: 'Currency Product',
        description: 'Currency description',
        price: 50.00,
        currency: 'EUR',
        categoryId: 'category-currency',
        type: ProductType.DIGITAL,
        tags: [],
        mediaUrls: [],
        inventoryCount: 25,
        attributes: {}
      };

      const product = ProductMapper.toEntity(dto);
      const defaultVariant = product.getDefaultVariant();

      expect(defaultVariant.getPrice().getCurrency()).toBe('EUR');
    });
  });
});

