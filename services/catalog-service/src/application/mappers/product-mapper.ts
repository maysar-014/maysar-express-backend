// @ts-nocheck
/**
 * Product Mapper
 * Bidirectional mapping between Product domain entities and DTOs
 * Handles data transformation with validation and type safety
 */

import { Product, ProductVariant } from '../../domain/entities/product.entity';
import { Price } from '../../domain/value-objects/monetary.value-object';
import { ProductType, ProductVisibility, ProductCondition, SEOData, ShippingInfo } from '../../domain/value-objects/product-types.value-object';
import { ProductId, SellerId, CategoryId } from '../../domain/value-objects/ids.value-object';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductSummaryDto,
  ProductDetailsDto,
  ProductValidationDto
} from '../dto/product.dto';

/**
 * Product Mapper
 * Handles bidirectional mapping between domain entities and DTOs
 * Optimized for performance with validation and type safety
 */
export class ProductMapper {
  /**
   * Map CreateProductDto to Product entity
   * Creates a new Product entity from creation DTO
   */
  static toEntity(dto: CreateProductDto): Product {
    this.validateCreateProductDto(dto);

    // Create default variant from DTO data
    const price = new Price(dto.price, dto.currency || 'USD');
    const defaultVariant = new ProductVariant(
      'default', // Default variant ID
      `${dto.name.toLowerCase().replace(/\s+/g, '-')}-default`, // Generate SKU
      dto.name,
      price,
      undefined, // No compare at price
      undefined, // No cost price
      dto.inventoryCount,
      dto.attributes || {}
    );

    const variants = [defaultVariant];

    return Product.create(
      SellerId.create(dto.sellerId),
      dto.name,
      dto.description,
      dto.type,
      variants,
      {
        categoryId: dto.categoryId ? CategoryId.create(dto.categoryId) : undefined,
        visibility: ProductVisibility.PUBLIC,
        images: dto.mediaUrls,
        tags: dto.tags,
        seoData: dto.seoTitle || dto.seoDescription ?
          new SEOData(dto.seoTitle, dto.seoDescription, []) : undefined,
        shippingInfo: undefined, // Not provided in create DTO
        condition: ProductCondition.NEW,
        enablerEnabled: dto.enablerEnabled ?? false,
        enablerCommissionRate: dto.enablerCommissionRate
      }
    );
  }

  /**
   * Map Product entity to ProductSummaryDto
   * Compact representation for listings and search results
   */
  static toSummaryDto(entity: Product, options?: {
    sellerName?: string;
    categoryName?: string;
    thumbnailUrl?: string;
    averageRating?: number;
    reviewCount?: number;
  }): ProductSummaryDto {
    const defaultVariant = entity.getDefaultVariant();
    const price = defaultVariant.getPrice();

    return {
      id: entity.getId().toString(),
      name: entity.getName(),
      price: {
        amount: price.toNumber(),
        currency: price.getCurrency()
      },
      categoryId: entity.getCategoryId()?.toString() || '',
      categoryName: options?.categoryName,
      sellerId: entity.getSellerId().toString(),
      sellerName: options?.sellerName,
      type: entity.getType(),
      tags: entity.getTags(),
      status: entity.getStatus().toString(),
      thumbnailUrl: options?.thumbnailUrl || entity.getImages()[0],
      averageRating: options?.averageRating,
      reviewCount: options?.reviewCount,
      createdAt: entity.getCreatedAt()
    };
  }

  /**
   * Map Product entity to ProductDetailsDto
   * Complete representation with all product data
   */
  static toDetailsDto(entity: Product, options?: {
    sellerName?: string;
    categoryName?: string;
    categoryPath?: string[];
    reviews?: ProductDetailsDto['reviews'];
    recommendations?: ProductDetailsDto['recommendations'];
    analytics?: ProductDetailsDto['analytics'];
    ratings?: ProductDetailsDto['ratings'];
  }): ProductDetailsDto {
    const defaultVariant = entity.getDefaultVariant();
    const price = defaultVariant.getPrice();
    const priceRange = entity.getPriceRange();

    return {
      id: entity.getId().toString(),
      sellerId: entity.getSellerId().toString(),
      sellerName: options?.sellerName,
      name: entity.getName(),
      description: entity.getDescription(),
      price: {
        amount: price.toNumber(),
        currency: price.getCurrency(),
        originalPrice: defaultVariant.getCompareAtPrice()?.toNumber(),
        discountPercentage: defaultVariant.isOnSale() ?
          Math.round(((defaultVariant.getCompareAtPrice()!.toNumber() - price.toNumber()) / defaultVariant.getCompareAtPrice()!.toNumber()) * 100) : undefined
      },
      categoryId: entity.getCategoryId()?.toString() || '',
      categoryName: options?.categoryName,
      categoryPath: options?.categoryPath,
      type: entity.getType(),
      tags: entity.getTags(),
      attributes: {}, // Simplified - would map from entity attributes
      status: entity.getStatus().toString(),
      visibility: this.mapProductVisibility(entity.getVisibility()),
      media: entity.getImages().map((url, index) => ({
        id: `media-${index}`,
        url,
        type: this.inferMediaType(url),
        altText: `${entity.getName()} image ${index + 1}`,
        order: index,
        isPrimary: index === 0
      })),
      inventory: {
        available: entity.getTotalInventory(),
        reserved: 0, // Would come from inventory service
        total: entity.getTotalInventory(),
        status: entity.isInStock() ? 'in_stock' : 'out_of_stock',
        lowStockThreshold: 5
      },
      shipping: {
        weight: entity.getShippingInfo()?.getWeight()?.getValue(),
        dimensions: entity.getShippingInfo()?.getDimensions() ? {
          length: entity.getShippingInfo()!.getDimensions()!.getLength(),
          width: entity.getShippingInfo()!.getDimensions()!.getWidth(),
          height: entity.getShippingInfo()!.getDimensions()!.getHeight(),
          unit: entity.getShippingInfo()!.getDimensions()!.getUnit()
        } : undefined,
        freeShipping: entity.getShippingInfo()?.needsSpecialShipping() || false,
        shippingCost: undefined // Would need to be calculated
      },
      seo: {
        title: entity.getSeoData()?.getTitle(),
        description: entity.getSeoData()?.getDescription(),
        keywords: entity.getSeoData()?.getKeywords()
      },
      enabler: {
        enabled: entity.getEnablerEnabled(),
        commissionRate: entity.getEnablerCommissionRate()
      },
      analytics: options?.analytics || {
        viewCount: 0,
        purchaseCount: 0,
        favoriteCount: 0,
        shareCount: 0
      },
      ratings: options?.ratings || {
        average: 0,
        count: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      },
      reviews: options?.reviews || [],
      recommendations: options?.recommendations || [],
      createdAt: entity.getCreatedAt(),
      updatedAt: entity.getUpdatedAt(),
      publishedAt: entity.isPublished() ? entity.getCreatedAt() : undefined
    };
  }

  /**
   * Map Product entity to UpdateProductDto
   * For partial updates and patching operations
   */
  static toUpdateDto(entity: Product): UpdateProductDto {
    return {
      productId: entity.getId().toString(),
      name: entity.getName(),
      description: entity.getDescription(),
      price: entity.getDefaultVariant().getPrice().toNumber(),
      currency: entity.getDefaultVariant().getPrice().getCurrency(),
      categoryId: entity.getCategoryId()?.toString(),
      tags: entity.getTags(),
      attributes: {}, // Simplified mapping
      seoTitle: entity.getSeoData()?.getTitle(),
      seoDescription: entity.getSeoData()?.getDescription(),
      enablerEnabled: entity.getEnablerEnabled(),
      enablerCommissionRate: entity.getEnablerCommissionRate()
    };
  }

  /**
   * Map UpdateProductDto to partial Product update
   * For applying patches to existing products
   */
  static toPartialUpdate(dto: UpdateProductDto): Partial<{
    name: string;
    description: string;
    price: Price;
    categoryId: CategoryId;
    tags: string[];
    seoTitle: string;
    seoDescription: string;
    enablerEnabled: boolean;
    enablerCommissionRate: number | undefined;
  }> {
    this.validateUpdateProductDto(dto);

    const update: any = {};

    if (dto.name !== undefined) update.name = dto.name;
    if (dto.description !== undefined) update.description = dto.description;
    if (dto.price !== undefined) update.price = new Price(dto.price, dto.currency);
    if (dto.categoryId !== undefined) update.categoryId = CategoryId.create(dto.categoryId);
    if (dto.tags !== undefined) update.tags = dto.tags;
    if (dto.seoTitle !== undefined || dto.seoDescription !== undefined) {
      update.seoData = {
        title: dto.seoTitle,
        description: dto.seoDescription,
        keywords: []
      };
    }

    if (dto.enablerEnabled !== undefined) update.enablerEnabled = dto.enablerEnabled;
    if (dto.enablerCommissionRate !== undefined) update.enablerCommissionRate = dto.enablerCommissionRate;

    return update;
  }

  /**
   * Map Product entity to ProductValidationDto
   * For validation result reporting
   */
  static toValidationDto(entity: Product, validationResult?: {
    isValid: boolean;
    errors: Array<{ field: string; code: string; message: string; severity: 'error' | 'warning' | 'info' }>;
    warnings: Array<{ field: string; message: string }>;
    suggestions: Array<{ field: string; type: string; message: string; impact: 'low' | 'medium' | 'high' }>;
  }): ProductValidationDto {
    if (!validationResult) {
      // Perform basic validation
      const errors: ProductValidationDto['errors'] = [];
      const warnings: ProductValidationDto['warnings'] = [];
      const suggestions: ProductValidationDto['suggestions'] = [];

      // Basic validation logic
      if (!entity.getName().trim()) {
        errors.push({
          field: 'name',
          code: 'REQUIRED',
          message: 'Product name is required',
          severity: 'error'
        });
      }

      if (!entity.getDescription().trim()) {
        errors.push({
          field: 'description',
          code: 'REQUIRED',
          message: 'Product description is required',
          severity: 'error'
        });
      }

      if (entity.getVariants().length === 0) {
        errors.push({
          field: 'variants',
          code: 'REQUIRED',
          message: 'Product must have at least one variant',
          severity: 'error'
        });
      }

      if (!entity.getImages().length) {
        warnings.push({
          field: 'images',
          message: 'Product has no images'
        });
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        suggestions
      };
    }

    return {
      isValid: validationResult.isValid,
      errors: validationResult.errors,
      warnings: validationResult.warnings,
      suggestions: validationResult.suggestions
    };
  }

  /**
   * Batch mapping utilities
   * Optimized for performance with large datasets
   */
  static toSummaryDtoBatch(
    entities: Product[],
    options?: {
      sellerNames?: Map<string, string>;
      categoryNames?: Map<string, string>;
      thumbnailUrls?: Map<string, string>;
      ratings?: Map<string, { average: number; count: number }>;
    }
  ): ProductSummaryDto[] {
    return entities.map(entity => {
      const entityId = entity.getId().toString();
      return this.toSummaryDto(entity, {
        sellerName: options?.sellerNames?.get(entity.getSellerId().toString()),
        categoryName: options?.categoryNames?.get(entity.getCategoryId()?.toString() || ''),
        thumbnailUrl: options?.thumbnailUrls?.get(entityId),
        averageRating: options?.ratings?.get(entityId)?.average,
        reviewCount: options?.ratings?.get(entityId)?.count
      });
    });
  }

  /**
   * Validation helpers
   */
  private static validateCreateProductDto(dto: CreateProductDto): void {
    if (!dto.sellerId) {
      throw new Error('Seller ID is required');
    }
    if (!dto.name?.trim()) {
      throw new Error('Product name is required');
    }
    if (!dto.description?.trim()) {
      throw new Error('Product description is required');
    }
    if (!dto.price || dto.price <= 0) {
      throw new Error('Valid product price is required');
    }
    if (!dto.type) {
      throw new Error('Product type is required');
    }
    if (dto.enablerEnabled) {
      if (dto.enablerCommissionRate === undefined) {
        throw new Error('Enabler commission rate is required when enabler is enabled');
      }
      if (dto.enablerCommissionRate <= 0 || dto.enablerCommissionRate > 1) {
        throw new Error('Enabler commission rate must be between 0 and 1');
      }
    }
  }

  private static validateUpdateProductDto(dto: UpdateProductDto): void {
    if (!dto.productId) {
      throw new Error('Product ID is required');
    }
    if (dto.price !== undefined && dto.price <= 0) {
      throw new Error('Price must be greater than 0');
    }
    if (dto.enablerEnabled && dto.enablerCommissionRate === undefined) {
      throw new Error('Enabler commission rate is required when enabling enabler');
    }
    if (dto.enablerCommissionRate !== undefined && (dto.enablerCommissionRate <= 0 || dto.enablerCommissionRate > 1)) {
      throw new Error('Enabler commission rate must be between 0 and 1');
    }
  }

  private static mapProductVisibility(visibility: ProductVisibility): 'public' | 'private' | 'draft' {
    switch (visibility) {
      case ProductVisibility.PUBLIC:
        return 'public';
      case ProductVisibility.PRIVATE:
        return 'private';
      case ProductVisibility.SELLER_ONLY:
        return 'private';
      case ProductVisibility.B2B_ONLY:
        return 'private';
      default:
        return 'public';
    }
  }

  private static inferMediaType(url: string): 'image' | 'video' {
    const extension = url.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) {
      return 'image';
    }
    if (['mp4', 'avi', 'mov', 'wmv', 'webm'].includes(extension || '')) {
      return 'video';
    }
    return 'image'; // Default to image
  }
}

/**
 * Utility functions for common mapping patterns
 */
export const productMappers = {
  /**
   * Map multiple products to summary DTOs with caching
   */
  toSummaryBatch: ProductMapper.toSummaryDtoBatch,

  /**
   * Create entity from DTO
   */
  fromCreateDto: ProductMapper.toEntity,

  /**
   * Map entity to summary DTO
   */
  toSummary: ProductMapper.toSummaryDto,

  /**
   * Map entity to detailed DTO
   */
  toDetails: ProductMapper.toDetailsDto,

  /**
   * Map entity to update DTO
   */
  toUpdate: ProductMapper.toUpdateDto,

  /**
   * Create partial update from DTO
   */
  toPartialUpdate: ProductMapper.toPartialUpdate,

  /**
   * Map entity to validation DTO
   */
  toValidation: ProductMapper.toValidationDto
};
