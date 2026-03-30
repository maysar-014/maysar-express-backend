// @ts-nocheck
/**
 * Prisma Product Repository Implementation
 * Infrastructure layer implementation of ProductRepository interface
 * Handles all product-related database operations using Prisma ORM
 */

import { PrismaClient } from '@prisma/client';
import { ProductRepository } from '../../domain/interfaces';
import { IProductRepository } from '../../domain/repositories/repository.interfaces';
import { Product, ProductVariant } from '../../domain/entities/product.entity';
import { ProductId, SellerId, CategoryId } from '../../domain/value-objects/ids.value-object';
import { Price } from '../../domain/value-objects/monetary.value-object';
import { ProductType, ProductVisibility, ProductCondition, ProductStatus as DomainProductStatus, ProductStatusValue } from '../../domain/value-objects/product-types.value-object';
import { ProductIdentifiers } from '../../domain/value-objects/product-identifiers.value-object';
import { ProductFingerprint } from '../../domain/value-objects/product-fingerprint.value-object';
import { getModelPrefix, makeId } from '@shared/ids/id';

// Prisma Enums (defined locally since Prisma client may not be generated)
enum ProductStatus {
  draft = 'draft',
  pending = 'pending',
  published = 'published',
  suspended = 'suspended',
  archived = 'archived'
}

enum Visibility {
  public = 'public',
  private = 'private',
  unlisted = 'unlisted'
}

enum InventoryPolicy {
  deny = 'deny',
  allow = 'allow'
}

enum VariantStatus {
  active = 'active',
  inactive = 'inactive',
  discontinued = 'discontinued'
}

/**
 * Prisma Product Repository
 * Implements the ProductRepository interface using Prisma ORM
 * Provides type-safe database operations with proper error handling
 */
export class PrismaProductRepository implements ProductRepository, IProductRepository {
  constructor(private readonly prisma: PrismaClient) { }

  /**
   * Save a product entity to the database
   * Handles both creation and updates with proper variant management
   */
  async save(product: any): Promise<any> {
    const productEntity = product as Product;
    const productId = productEntity.getId().toString();

    // Extract basic product data
    const productData = {
      id: productId,
      sellerId: productEntity.getSellerId().toString(),
      title: productEntity.getName(),
      description: productEntity.getDescription(),
      categoryId: productEntity.getCategoryId()?.toString() || '',
      status: this.mapProductStatus(productEntity.getStatus().toString()),
      visibility: this.mapProductVisibility(productEntity.getVisibility()),
      tags: productEntity.getTags(),
      enablerEnabled: productEntity.getEnablerEnabled(),
      enablerCommissionRate: productEntity.getEnablerCommissionRate(),
      updatedAt: new Date()
    };

    // Extract variants data
    const variants = productEntity.getVariants().map((variant, index) => ({
      id: variant.getId?.() || `${productId}-variant-${index}`,
      sku: variant.getSku?.() || `${productId}-sku-${index}`,
      name: variant.getName?.() || productEntity.getName(),
      price: this.resolveNumericValue(variant.getPrice?.(), 0) ?? 0,
      compareAtPrice: this.resolveNumericValue(variant.getCompareAtPrice?.(), undefined),
      costPrice: this.resolveNumericValue(variant.getCostPrice?.(), undefined),
      attributes: variant.getAttributes?.() || {},
      status: VariantStatus.active
    }));

    // Use transaction for atomic operations
    const result = await this.prisma.$transaction(async (tx: any) => {
      // Create or update product
      const savedProduct = await tx.product.upsert({
        where: { id: productData.id },
        update: {
          title: productData.title,
          description: productData.description,
          categoryId: productData.categoryId,
          status: productData.status,
          visibility: productData.visibility,
          tags: productData.tags,
          enablerEnabled: productData.enablerEnabled,
          enablerCommissionRate: productData.enablerCommissionRate,
          updatedAt: productData.updatedAt
        },
        create: {
          ...productData,
          createdAt: new Date()
        }
      });

      // Handle variants - delete existing and create new ones, even when empty.
      await tx.productVariant.deleteMany({
        where: { productId: productData.id }
      });

      await tx.productVariant.createMany({
        data: variants.map(variant => ({
          ...variant,
          productId: productData.id,
          attributes: variant.attributes || {},
          status: variant.status
        }))
      });

      return savedProduct;
    });

    return result;
  }

  /**
   * Save product with attributes in a single transaction
   * Ensures both product and attributes are persisted atomically
   */
  async saveWithAttributesTransaction(
    persistenceDto: any,
    productId: string,
    attributes: Array<{ attributeId: string; value: string }>
  ): Promise<void> {
    await this.prisma.$transaction(async (tx: any) => {
      // Save product
      await tx.product.create({
        data: {
          id: persistenceDto.id,
          sellerId: persistenceDto.sellerId,
          title: persistenceDto.title,
          description: persistenceDto.description,
          categoryId: persistenceDto.categoryId,
          brand: persistenceDto.brand,
          slug: persistenceDto.slug,
          seoTitle: persistenceDto.seoTitle,
          shortSeoDescription: persistenceDto.shortSeoDescription,
          generatedDescription: persistenceDto.generatedDescription,
          qualityScore: persistenceDto.qualityScore,
          status: persistenceDto.status,
          visibility: persistenceDto.visibility,
          tags: persistenceDto.tags,
          enablerEnabled: persistenceDto.enablerEnabled ?? false,
          enablerCommissionRate: persistenceDto.enablerCommissionRate ?? null,
          createdAt: persistenceDto.createdAt,
          updatedAt: persistenceDto.updatedAt
        }
      });

      // Save attributes if any
      if (attributes.length > 0) {
        await tx.productAttribute.createMany({
          data: attributes.map((attr: any) => ({
            id: makeId(getModelPrefix('ProductAttribute')),
            productId,
            attributeId: attr.attributeId,
            value: attr.value,
            createdAt: new Date()
          }))
        });
      }
    });
  }

  /**
   * Find product by ID with variants
   */
  async findById(id: string): Promise<any | null> {
    const productData = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        variants: true
      }
    });

    if (!productData) return null;

    return this.normalizeProductRecord(productData);
  }

  /**
   * Find products by seller with pagination
   */
  async findBySeller(sellerId: string): Promise<any[]> {
    const productsData = await this.prisma.product.findMany({
      where: { sellerId },
      include: {
        category: true,
        variants: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return productsData.map((product: any) => this.normalizeProductRecord(product));
  }

  /**
   * Find products by category with pagination
   */
  async findByCategory(categoryId: string): Promise<any[]> {
    const productsData = await this.prisma.product.findMany({
      where: { categoryId },
      include: {
        category: true,
        variants: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return productsData.map((product: any) => this.normalizeProductRecord(product));
  }

  /**
   * Search products with advanced filtering and pagination
   */
  async search(filters: any, pagination: any): Promise<any> {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    // Build where clause from filters
    const where: any = {};

    if (filters.category) {
      where.categoryId = filters.category;
    }

    if (filters.seller) {
      where.sellerId = filters.seller;
    }

    if (filters.status) {
      where.status = this.mapProductStatus(filters.status);
    }

    if (filters.visibility) {
      where.visibility = this.mapProductVisibility(filters.visibility);
    }

    if (filters.tags && filters.tags.length > 0) {
      where.tags = {
        hasSome: filters.tags
      };
    }

    if (filters.priceRange) {
      // Filter by variant prices
      where.variants = {
        some: {
          price: {
            gte: filters.priceRange.min,
            lte: filters.priceRange.max
          }
        }
      };
    }

    // Execute search
    const [productsData, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          category: true,
          variants: true
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.product.count({ where })
    ]);

    const products = productsData.map(product => this.normalizeProductRecord(product));

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Update product status
   */
  async updateStatus(id: string, status: string): Promise<any> {
    const productData = await this.prisma.product.update({
      where: { id },
      data: {
        status: this.mapProductStatus(status),
        updatedAt: new Date()
      },
      include: {
        category: true,
        variants: true
      }
    });

    return productData;
  }

  /**
   * Delete product (soft delete by setting status to archived)
   */
  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.product.update({
        where: { id },
        data: {
          status: ProductStatus.archived,
          updatedAt: new Date()
        }
      });
      return true;
    } catch (error) {
      console.error('Error deleting product:', error);
      return false;
    }
  }

  /**
   * Find products by identifiers (GTIN, MPN, ISBN)
   * Used for exact matching in catalog matching engine
   */
  async findByIdentifiers(identifiers: ProductIdentifiers): Promise<Product[]> {
    const where: any = {
      OR: []
    };

    if (identifiers.gtin) {
      where.OR.push({ gtin: identifiers.gtin });
    }
    if (identifiers.mpn) {
      where.OR.push({ mpn: identifiers.mpn });
    }
    if (identifiers.isbn) {
      where.OR.push({ isbn: identifiers.isbn });
    }

    if (where.OR.length === 0) {
      return [];
    }

    const productsData = await this.prisma.product.findMany({
      where,
      include: {
        category: true,
        variants: true
      }
    });

    return productsData.map(product => this.normalizeProductRecord(product));
  }

  /**
   * Find products by fingerprint and category
   * Used for strong matching in catalog matching engine
   */
  async findByFingerprint(fingerprint: string, categoryId: string): Promise<Product[]> {
    const productsData = await this.prisma.product.findMany({
      where: {
        fingerprint,
        categoryId
      },
      include: {
        category: true,
        variants: true
      }
    });

    return productsData.map(product => this.normalizeProductRecord(product));
  }

  /**
   * Find products by category and brand
   * Used for similarity matching in catalog matching engine
   */
  async findByCategoryAndBrand(categoryId: string, brand: string): Promise<Product[]> {
    const productsData = await this.prisma.product.findMany({
      where: {
        categoryId,
        brand: {
          contains: brand,
          mode: 'insensitive'
        }
      },
      include: {
        category: true,
        variants: true
      }
    });

    return productsData.map(product => this.normalizeProductRecord(product));
  }

  // Private helper methods

  private mapProductStatus(status: string): ProductStatus {
    switch (status) {
      case 'draft': return ProductStatus.draft;
      case 'pending_review': return ProductStatus.pending;
      case 'published': return ProductStatus.published;
      case 'suspended': return ProductStatus.suspended;
      case 'archived': return ProductStatus.archived;
      default: return ProductStatus.draft;
    }
  }

  private mapProductVisibility(visibility: ProductVisibility | string): Visibility {
    switch (String(visibility).toLowerCase()) {
      case 'public':
        return Visibility.public;
      case 'private':
      case 'seller_only':
        return Visibility.private;
      case 'b2b_only':
      case 'unlisted':
        return Visibility.unlisted;
      default:
        return Visibility.public;
    }
  }

  private normalizeProductRecord(productData: any): any {
    const variants = Array.isArray(productData.variants)
      ? productData.variants.map((variant: any) => this.normalizeVariantRecord(variant))
      : [];
    const defaultVariant = variants[0];
    const name = productData.name || productData.title || '';
    const priceSource = productData.price ?? defaultVariant?.price ?? 0;
    const currencySource = productData.currency ?? defaultVariant?.currency ?? 'USD';

    return {
      id: productData.id,
      title: name,
      name,
      sellerId: productData.sellerId,
      description: productData.description ?? '',
      categoryId: productData.categoryId ?? '',
      status: productData.status ?? 'draft',
      visibility: productData.visibility ?? 'public',
      type: productData.type ?? 'physical',
      tags: Array.isArray(productData.tags) ? productData.tags : [],
      attributes: productData.attributes || defaultVariant?.attributes || {},
      price: {
        amount: this.resolveNumericValue(priceSource, 0) ?? 0,
        currency: this.resolveCurrency(currencySource)
      },
      variants,
      category: productData.category ?? null,
      createdAt: productData.createdAt ?? new Date(),
      updatedAt: productData.updatedAt ?? new Date(),
      publishedAt: productData.publishedAt ?? productData.published_at,
      brand: productData.brand,
      model: productData.model,
      slug: productData.slug,
      enablerEnabled: !!productData.enablerEnabled,
      enablerCommissionRate: productData.enablerCommissionRate !== undefined
        ? Number(productData.enablerCommissionRate)
        : undefined
    };
  }

  private normalizeVariantRecord(variantData: any): any {
    const price = this.resolveNumericValue(variantData.price ?? variantData.getPrice?.(), 0) ?? 0;
    const compareAtPrice = this.resolveNumericValue(
      variantData.compareAtPrice ?? variantData.getCompareAtPrice?.(),
      undefined
    );
    const costPrice = this.resolveNumericValue(variantData.costPrice ?? variantData.getCostPrice?.(), undefined);
    const inventoryQuantity = this.resolveNumericValue(
      variantData.inventoryQuantity ?? variantData.stock ?? variantData.getInventoryQuantity?.(),
      0
    ) ?? 0;

    return {
      id: variantData.id,
      sku: variantData.sku,
      name: variantData.name,
      price,
      compareAtPrice,
      costPrice,
      inventoryQuantity,
      stock: inventoryQuantity,
      attributes: variantData.attributes || {},
      status: variantData.status || VariantStatus.active
    };
  }

  private resolveNumericValue(value: any, fallback?: number): number | undefined {
    if (value === null || value === undefined) {
      return fallback;
    }

    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : fallback;
    }

    if (typeof value === 'object') {
      if (typeof value.toNumber === 'function') {
        const converted = Number(value.toNumber());
        return Number.isFinite(converted) ? converted : fallback;
      }

      if (typeof value.amount === 'number') {
        return value.amount;
      }

      if (typeof value.value === 'number') {
        return value.value;
      }
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private resolveCurrency(value: any, fallback: string = 'USD'): string {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }

    if (value && typeof value === 'object' && typeof value.currency === 'string') {
      return value.currency;
    }

    return fallback;
  }

  private mapPrismaProductToDomain(productData: any): Product {
    const sourceVariants = Array.isArray(productData.variants) && productData.variants.length > 0
      ? productData.variants
      : [
          {
            id: `${productData.id}-default`,
            sku: productData.slug || `${productData.id}-default`,
            name: productData.title,
            price: 0,
            compareAtPrice: null,
            costPrice: null,
            inventoryQuantity: 0,
            attributes: {}
          }
        ];

    // Older contract-test records may not have persisted variants yet.
    const variants = sourceVariants.map((variantData: any) => {
      const price = new Price(Number(variantData.price), 'USD');
      const compareAtPrice = variantData.compareAtPrice ? new Price(Number(variantData.compareAtPrice), 'USD') : undefined;
      const costPrice = variantData.costPrice ? Number(variantData.costPrice) : undefined;

      return new ProductVariant(
        variantData.id,
        variantData.sku,
        variantData.name || productData.title,
        price,
        compareAtPrice,
        costPrice,
        variantData.inventoryQuantity || 0,
        variantData.attributes || {}
      );
    });

    // Create product entity
    const productId = ProductId.fromString(productData.id);
    const sellerId = SellerId.fromString(productData.sellerId);
    const categoryId = productData.categoryId ? CategoryId.fromString(productData.categoryId) : undefined;

      return new Product(
        productId,
        sellerId,
        productData.title,
        productData.description || '',
        this.mapStatusToDomain(productData.status),
        ProductType.PHYSICAL,
        this.mapVisibilityToDomain(productData.visibility),
        categoryId,
        productData.brand || undefined,
        productData.model || undefined,
        variants,
        [],
        productData.tags || [],
        undefined,
        undefined,
        ProductCondition.NEW,
        undefined,
        undefined,
        productData.createdAt,
        productData.updatedAt,
        !!productData.enablerEnabled,
        productData.enablerCommissionRate ? Number(productData.enablerCommissionRate) : undefined
      );
    }

  private mapVisibilityToDomain(visibility: Visibility): ProductVisibility {
    switch (visibility) {
      case Visibility.public: return ProductVisibility.PUBLIC;
      case Visibility.private: return ProductVisibility.PRIVATE;
      case Visibility.unlisted: return ProductVisibility.B2B_ONLY;
      default: return ProductVisibility.PUBLIC;
    }
  }

  private mapStatusToDomain(status: string): ProductStatusValue {
    switch (status) {
      case ProductStatus.draft:
        return ProductStatusValue.fromString(DomainProductStatus.DRAFT);
      case ProductStatus.pending:
        return ProductStatusValue.fromString(DomainProductStatus.PENDING_REVIEW);
      case ProductStatus.published:
        return ProductStatusValue.fromString(DomainProductStatus.PUBLISHED);
      case ProductStatus.suspended:
        return ProductStatusValue.fromString(DomainProductStatus.SUSPENDED);
      case ProductStatus.archived:
        return ProductStatusValue.fromString(DomainProductStatus.ARCHIVED);
      default:
        return ProductStatusValue.fromString(DomainProductStatus.DRAFT);
    }
  }
}

/**
 * Repository Factory for Dependency Injection
 */
export class ProductRepositoryFactory {
  private static instance: PrismaProductRepository | null = null;

  static create(prisma: PrismaClient): ProductRepository {
    if (!this.instance) {
      this.instance = new PrismaProductRepository(prisma);
    }
    return this.instance;
  }

  static getInstance(): ProductRepository | null {
    return this.instance;
  }
}
