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
          supplierLocationId: persistenceDto.supplierLocationId ?? null,
          supplierLocation: persistenceDto.supplierLocation ?? null,
          categoryId: persistenceDto.categoryId,
          brand: persistenceDto.brand,
          slug: persistenceDto.slug,
          seoTitle: persistenceDto.seoTitle,
          shortSeoDescription: persistenceDto.shortSeoDescription,
          generatedDescription: persistenceDto.generatedDescription,
          seoMetadata: persistenceDto.seoMetadata ?? undefined,
          qualityScore: persistenceDto.qualityScore,
          status: persistenceDto.status,
          visibility: persistenceDto.visibility,
          tags: persistenceDto.tags,
          enablerEnabled: persistenceDto.enablerEnabled ?? false,
          enablerCommissionRate: persistenceDto.enablerCommissionRate ?? null,
          codAccepted: persistenceDto.codAccepted ?? false,
          freeDelivery: persistenceDto.freeDelivery ?? false,
          condition: persistenceDto.condition ?? 'new',
          createdAt: persistenceDto.createdAt,
          updatedAt: persistenceDto.updatedAt
        }
      });

      await tx.productVariant.create({
        data: {
          id: `${productId}-default-variant`,
          productId,
          sku: `${persistenceDto.slug}-default`,
          name: persistenceDto.title,
          price: persistenceDto.basePrice ?? 0,
          compareAtPrice: null,
          costPrice: null,
          inventoryPolicy: InventoryPolicy.deny,
          weight: null,
          dimensions: null,
          attributes: {
            currency: persistenceDto.currency ?? 'TZS'
          },
          images: this.extractMediaUrls(persistenceDto),
          status: VariantStatus.active
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
        variants: true,
        mediaRef: { orderBy: { displayOrder: 'asc' } }
      }
    });

    if (!productData) return null;

    return this.enrichWithStock(this.normalizeProductRecord(productData));
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

    return this.enrichManyWithStock(productsData.map((p: any) => this.normalizeProductRecord(p)));
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

    return this.enrichManyWithStock(productsData.map((p: any) => this.normalizeProductRecord(p)));
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
          variants: true,
          mediaRef: { orderBy: { displayOrder: 'asc' } }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.product.count({ where })
    ]);

    const products = await this.enrichManyWithStock(productsData.map(product => this.normalizeProductRecord(product)));

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

    return this.enrichManyWithStock(productsData.map(product => this.normalizeProductRecord(product)));
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

    return this.enrichManyWithStock(productsData.map(product => this.normalizeProductRecord(product)));
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

    return this.enrichManyWithStock(productsData.map(product => this.normalizeProductRecord(product)));
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
    const mediaUrls = this.extractMediaUrls(productData);
    const name = productData.name || productData.title || '';
    const priceSource = productData.price ?? defaultVariant?.price ?? 0;
    const currencySource = productData.currency ?? defaultVariant?.currency ?? 'TZS';

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
      supplierLocationId: this.resolveSupplierLocationId(productData),
      supplierLocation: this.resolveSupplierLocation(productData),
      images: mediaUrls,
      mediaUrls,
      thumbnailUrl: mediaUrls[0],
      media: mediaUrls.map((url: string, index: number) => ({
        id: `${productData.id}-media-${index}`,
        url,
        type: 'image',
        order: index,
        isPrimary: index === 0
      })),
      variants,
      category: productData.category ?? null,
      categoryName: productData.category?.name ?? productData.category?.label ?? null,
      createdAt: productData.createdAt ?? new Date(),
      updatedAt: productData.updatedAt ?? new Date(),
      publishedAt: productData.publishedAt ?? productData.published_at,
      brand: productData.brand,
      model: productData.model,
      slug: productData.slug,
      enablerEnabled: !!productData.enablerEnabled,
      enablerCommissionRate: productData.enablerCommissionRate !== undefined
        ? Number(productData.enablerCommissionRate)
        : undefined,
      codAccepted: productData.codAccepted === true,
      freeDelivery: productData.freeDelivery === true,
      condition: productData.condition ?? 'new'
    };
  }

  async updateDetails(id: string, updates: Record<string, any>): Promise<any> {
    const existing = await this.prisma.product.findUnique({
      where: { id },
      include: {
        variants: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!existing) {
      return null;
    }

    const nextSeoMetadata = {
      ...((existing.seoMetadata as Record<string, unknown> | null) || {})
    };

    if (updates.currency) {
      nextSeoMetadata.currency = updates.currency;
    }

    if (typeof updates.supplierLocation === 'string') {
      nextSeoMetadata.supplierLocation = updates.supplierLocation.trim();
    }

    const productData: Record<string, unknown> = {
      updatedAt: new Date()
    };

    if (updates.name !== undefined) productData.title = updates.name;
    if (updates.description !== undefined) productData.description = updates.description;
    if (updates.categoryId !== undefined) productData.categoryId = updates.categoryId;
    if (updates.supplierLocation !== undefined) productData.supplierLocation = updates.supplierLocation;
    if (updates.tags !== undefined) productData.tags = updates.tags;
    if (updates.seoTitle !== undefined) productData.seoTitle = updates.seoTitle;
    if (updates.seoDescription !== undefined) productData.shortSeoDescription = updates.seoDescription;
    if (updates.enablerEnabled !== undefined) productData.enablerEnabled = updates.enablerEnabled;
    if (updates.enablerCommissionRate !== undefined) productData.enablerCommissionRate = updates.enablerCommissionRate;
    if (updates.codAccepted !== undefined) productData.codAccepted = updates.codAccepted;
    if (updates.freeDelivery !== undefined) productData.freeDelivery = updates.freeDelivery;
    if (updates.condition !== undefined) productData.condition = updates.condition;
    if (updates.currency !== undefined || updates.supplierLocation !== undefined) {
      productData.seoMetadata = nextSeoMetadata;
    }

    return this.prisma.$transaction(async (tx: any) => {
      await tx.product.update({
        where: { id },
        data: productData
      });

      const firstVariant = await tx.productVariant.findFirst({
        where: { productId: id },
        orderBy: { createdAt: 'asc' }
      });

      if (firstVariant && (updates.price !== undefined || updates.currency !== undefined || updates.attributes !== undefined)) {
        const nextAttributes = {
          ...((firstVariant.attributes as Record<string, unknown> | null) || {})
        };

        if (updates.attributes && typeof updates.attributes === 'object') {
          Object.assign(nextAttributes, updates.attributes);
        }

        if (updates.currency) {
          nextAttributes.currency = updates.currency;
        }

        await tx.productVariant.update({
          where: { id: firstVariant.id },
          data: {
            price: updates.price !== undefined ? updates.price : firstVariant.price,
            attributes: nextAttributes
          }
        });
      }

      return tx.product.findUnique({
        where: { id },
        include: {
          category: true,
          variants: true
        }
      });
    });
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
      currency: this.resolveCurrency(variantData.attributes),
      compareAtPrice,
      costPrice,
      inventoryQuantity,
      stock: inventoryQuantity,
      images: Array.isArray(variantData.images) ? variantData.images.filter((image: unknown) => typeof image === 'string') : [],
      attributes: variantData.attributes || {},
      status: variantData.status || VariantStatus.active
    };
  }

  private extractMediaUrls(productData: any): string[] {
    const candidates: unknown[] = [];

    if (Array.isArray(productData?.mediaRef)) {
      for (const ref of productData.mediaRef) {
        if (typeof ref?.url === 'string') {
          candidates.push(ref.url);
        }
      }
    }

    if (Array.isArray(productData?.mediaUrls)) {
      candidates.push(...productData.mediaUrls);
    }

    if (productData?.seoMetadata && typeof productData.seoMetadata === 'object') {
      const seoMetadata = productData.seoMetadata as Record<string, unknown>;
      if (Array.isArray(seoMetadata.mediaUrls)) {
        candidates.push(...seoMetadata.mediaUrls);
      }
    }

    if (Array.isArray(productData?.variants)) {
      for (const variant of productData.variants) {
        if (Array.isArray(variant?.images)) {
          candidates.push(...variant.images);
        }
      }
    }

    return Array.from(
      new Set(
        candidates
          .filter((value): value is string => typeof value === 'string')
          .map((value) => value.trim())
          .filter(Boolean)
      )
    );
  }

  private resolveSupplierLocation(productData: any): string | undefined {
    if (typeof productData?.supplierLocation === 'string' && productData.supplierLocation.trim().length > 0) {
      return productData.supplierLocation.trim();
    }

    if (productData?.seoMetadata && typeof productData.seoMetadata === 'object') {
      const supplierLocation = (productData.seoMetadata as Record<string, unknown>).supplierLocation;
      if (typeof supplierLocation === 'string' && supplierLocation.trim().length > 0) {
        return supplierLocation.trim();
      }
    }

    return undefined;
  }

  private resolveSupplierLocationId(productData: any): string | undefined {
    if (typeof productData?.supplierLocationId === 'string' && productData.supplierLocationId.trim().length > 0) {
      return productData.supplierLocationId.trim();
    }

    if (productData?.seoMetadata && typeof productData.seoMetadata === 'object') {
      const supplierLocationId = (productData.seoMetadata as Record<string, unknown>).supplierLocationId;
      if (typeof supplierLocationId === 'string' && supplierLocationId.trim().length > 0) {
        return supplierLocationId.trim();
      }
    }

    return undefined;
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

  private resolveCurrency(value: any, fallback: string = 'TZS'): string {
    const ACCEPTED_CURRENCIES = new Set(['TZS']);

    let resolved: string | undefined;

    if (typeof value === 'string' && value.trim().length > 0) {
      resolved = value.trim();
    } else if (value && typeof value === 'object' && typeof value.currency === 'string') {
      resolved = value.currency;
    } else if (value && typeof value === 'object' && value.attributes && typeof value.attributes.currency === 'string') {
      resolved = value.attributes.currency;
    }

    if (resolved !== undefined && ACCEPTED_CURRENCIES.has(resolved)) {
      return resolved;
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

  /**
   * Fetch stock quantities for a batch of variant IDs and return a map
   * variantId -> availableQuantity (quantityAvailable - quantityReserved, min 0)
   */
  private async fetchStockByVariantIds(variantIds: string[]): Promise<Map<string, number>> {
    if (variantIds.length === 0) return new Map();

    try {
      const stockItems = await (this.prisma as any).inventory_StockItem.findMany({
        where: { productVariantId: { in: variantIds } },
        select: { productVariantId: true, quantityAvailable: true, quantityReserved: true }
      });

      const stockMap = new Map<string, number>();
      for (const item of stockItems) {
        const available = Math.max(0, (item.quantityAvailable ?? 0) - (item.quantityReserved ?? 0));
        const current = stockMap.get(item.productVariantId) ?? 0;
        stockMap.set(item.productVariantId, current + available);
      }
      return stockMap;
    } catch (error) {
      // Inventory service unavailable — degrade gracefully, products show out_of_stock
      console.warn('[PrismaProductRepository] fetchStockByVariantIds failed, defaulting to empty stock map:', (error as Error).message);
      return new Map();
    }
  }

  /**
   * Enrich a single normalised product record with live stock quantities.
   */
  private async enrichWithStock(product: any): Promise<any> {
    try {
      const variantIds: string[] = (product.variants ?? []).map((v: any) => v.id).filter(Boolean);
      const stockMap = await this.fetchStockByVariantIds(variantIds);
      const enriched = this.applyStockToProduct(product, stockMap);
      const sellerNameMap = await this.fetchSellerNamesByIds(
        product.sellerId ? [product.sellerId] : []
      );
      return { ...enriched, sellerName: sellerNameMap.get(product.sellerId) ?? null };
    } catch (error) {
      console.warn('[PrismaProductRepository] enrichWithStock failed, returning product without stock data:', (error as Error).message);
      return { ...product, sellerName: null };
    }
  }

  /**
   * Fetch business display names for a batch of seller IDs.
   * Falls back to user display name, then "Seller" if no business found.
   * Returns a map of sellerId -> display name.
   */
  private async fetchSellerNamesByIds(sellerIds: string[]): Promise<Map<string, string>> {
    if (sellerIds.length === 0) return new Map();

    const businesses = await (this.prisma as any).business.findMany({
      where: { ownerId: { in: sellerIds } },
      select: { ownerId: true, name: true }
    });

    const map = new Map<string, string>();
    for (const biz of businesses) {
      if (biz.ownerId && biz.name) {
        map.set(biz.ownerId, biz.name);
      }
    }

    // For sellers without a business, fall back to User_User firstName+lastName
    const missingIds = sellerIds.filter(id => !map.has(id));
    if (missingIds.length > 0) {
      try {
        const users = await (this.prisma as any).user_User.findMany({
          where: { id: { in: missingIds } },
          select: { id: true, firstName: true, lastName: true, email: true }
        });
        for (const user of users) {
          const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
            || user.email?.split('@')[0]
            || 'Seller';
          map.set(user.id, name);
        }
      } catch {
        // ignore — fallback below handles it
      }

      // Any still missing — use generic fallback
      for (const id of missingIds) {
        if (!map.has(id)) {
          map.set(id, 'Seller');
        }
      }
    }

    return map;
  }

  /**
   * Enrich a batch of normalised product records with live stock quantities.
   * using a single DB query for all variants.
   */
  private async enrichManyWithStock(products: any[]): Promise<any[]> {
    try {
      const variantIds: string[] = products
        .flatMap((p: any) => (p.variants ?? []).map((v: any) => v.id))
        .filter(Boolean);
      const stockMap = await this.fetchStockByVariantIds(variantIds);

      const sellerIds = [...new Set(products.map((p: any) => p.sellerId).filter(Boolean))];
      const sellerNameMap = await this.fetchSellerNamesByIds(sellerIds);

      return products.map(p => {
        const enriched = this.applyStockToProduct(p, stockMap);
        return { ...enriched, sellerName: sellerNameMap.get(p.sellerId) ?? null };
      });
    } catch (error) {
      console.warn('[PrismaProductRepository] enrichManyWithStock failed, returning products without stock data:', (error as Error).message);
      return products.map(p => ({ ...p, sellerName: null }));
    }
  }

  /**
   * Apply a pre-fetched stock map to a normalised product record.
   */
  private applyStockToProduct(product: any, stockMap: Map<string, number>): any {
    const enrichedVariants = (product.variants ?? []).map((variant: any) => {
      const qty = stockMap.get(variant.id) ?? 0;
      return { ...variant, inventoryQuantity: qty, stock: qty };
    });
    return { ...product, variants: enrichedVariants };
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
