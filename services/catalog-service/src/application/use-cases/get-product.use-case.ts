/**
 * Get Product Use Case
 * Application layer orchestration for product retrieval
 * Coordinates domain objects to fulfill the get product business use case
 */

import {
  ProductRepository,
  MediaRepository,
  SearchService,
  DomainRecord
} from '../../domain/interfaces';
import { ProductReviewRepository } from '../../domain/repositories/product-review.repository.interface';
import { classifyStockStatus } from '@shared/inventory/classifyStockStatus';
type ProductRecord = {
  id?: string;
  sellerId?: string;
  supplierLocationId?: string;
  supplierLocation?: string;
  name?: string;
  brand?: string;
  description?: string;
  price?: {
    amount?: number;
    currency?: string;
  } | number;
  currency?: string;
  categoryId?: string;
  categoryName?: string;
  type?: string;
  tags?: string[];
  images?: string[];
  mediaUrls?: string[];
  thumbnailUrl?: string;
  media?: Array<{
    id?: string;
    url?: string;
    type?: string;
    order?: number;
    isPrimary?: boolean;
  }>;
  attributes?: Record<string, unknown>;
  seoMetadata?: Record<string, unknown> | null;
  status?: string;
  createdAt?: Date;
  updatedAt?: Date;
  getId?: () => { toString(): string } | string;
  getDefaultVariant?: () => {
    getPrice(): {
      toNumber(): number;
      getCurrency(): string;
    };
    getAttributes?: () => Record<string, unknown>;
  };
  getSellerId?: () => { toString(): string } | string;
  getName?: () => string;
  getDescription?: () => string;
  getCategoryId?: () => { toString(): string } | string | undefined;
  getType?: () => string;
  getTags?: () => string[];
  getStatus?: () => { toString(): string } | string;
  getCreatedAt?: () => Date;
  getUpdatedAt?: () => Date;
};

type SearchResultRecord = {
  id?: string;
  name?: string;
  price?: number;
  score?: number;
};

export interface GetProductRequest {
  productId: string;
  includeMedia?: boolean;
  includeRecommendations?: boolean;
}

export interface ProductDetails {
  id: string;
  sellerId: string;
  supplierLocationId?: string;
  supplierLocation?: string;
  name: string;
  brand?: string;
  description: string;
  price: {
    amount: number;
    currency: string;
  };
  categoryId: string;
  categoryName?: string;
  type: string;
  tags: string[];
  attributes: Record<string, unknown>;
  status: string;
  media?: Array<{
    id: string;
    url: string;
    type: string;
    order: number;
    isPrimary?: boolean;
  }>;
  mediaUrls?: string[];
  thumbnailUrl?: string;
  inventoryAvailable?: number;
  inventory?: {
    available: number;
    reserved: number;
    total: number;
    status: 'in_stock' | 'low_stock' | 'out_of_stock';
  };
  ratings?: {
    average: number | null;
    count: number;
    distribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
  };
  recommendations?: Array<{
    productId: string;
    name: string;
    price: number;
    relevanceScore: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
  qualityScore?: number;
  variants?: Array<{
    id: string;
    name: string;
    sku?: string;
    price: number;
    status?: string;
    inventoryQuantity?: number | null;
    quantityReserved?: number | null;
  }>;
  variantId?: string | null;
}

export interface GetProductResponse {
  product?: ProductDetails;
  status: 'success' | 'not_found' | 'error';
  message: string;
}

/**
 * Get Product Use Case
 * Orchestrates domain objects to retrieve product details
 * Aggregates data from multiple repositories for complete product view
 */
export class GetProductUseCase {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly mediaRepository: MediaRepository,
    private readonly searchService?: SearchService,
    private readonly reviewRepository?: ProductReviewRepository
  ) {}

  async execute(request: GetProductRequest): Promise<GetProductResponse> {
    try {
      // Validate product ID format
      if (!request.productId) {
        return {
          status: 'error',
          message: 'Product ID is required'
        };
      }

      // Retrieve product from repository — transparent identifier resolution:
      // try by system ID first, fall back to slug if the ID lookup returns null.
      // If findById throws a format/validation error (e.g. Prisma P2023 for a
      // malformed UUID), treat that as "not found by ID" and try the slug path.
      let product: DomainRecord | null = null;
      try {
        product = await this.productRepository.findById(request.productId);
      } catch {
        // findById threw — identifier is likely not a valid system ID format.
        // Fall through to the slug lookup below.
      }
      if (!product) {
        try {
          product = await this.productRepository.findBySlug(request.productId);
        } catch {
          // findBySlug also threw — treat as not found
        }
      }
      if (!product) {
        return {
          status: 'not_found',
          message: 'Product not found'
        };
      }

      // Build product details (inventory is calculated inside buildProductDetails)
      const productDetails = await this.buildProductDetails(product, request);

      return {
        product: productDetails,
        status: 'success',
        message: 'Product retrieved successfully'
      };

    } catch (error) {
      console.error('GetProductUseCase error:', error);

      return {
        status: 'error',
        message: 'Internal error occurred while retrieving product'
      };
    }
  }

  private async buildProductDetails(product: ProductRecord, request: GetProductRequest): Promise<ProductDetails> {
    const normalizedProduct = this.normalizeProductRecord(product);

    // Calculate inventory from enriched variant stock data (populated by repository.enrichWithStock)
    const rawProduct = product as any;
    const variants: any[] = Array.isArray(rawProduct.variants) ? rawProduct.variants : [];
    const totalAvailable = variants.reduce(
      (sum: number, v: any) => sum + Math.max(0, Number(v.inventoryQuantity ?? v.stock ?? 0)),
      0
    );
    const totalReserved = variants.reduce(
      (sum: number, v: any) => sum + Math.max(0, Number(v.quantityReserved ?? 0)),
      0
    );

    // RC-3 fix: use shared quantity-threshold classification so catalog and analytics agree
    let stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock' = 'out_of_stock';
    if (totalAvailable > 0) {
      const reorderPoint = Number(rawProduct.reorderPoint ?? variants[0]?.reorderPoint ?? 0);
      stockStatus = classifyStockStatus(totalAvailable, reorderPoint);
    }

    const details: ProductDetails = {
      id: normalizedProduct.id,
      sellerId: normalizedProduct.sellerId,
      supplierLocationId: normalizedProduct.supplierLocationId,
      supplierLocation: normalizedProduct.supplierLocation,
      name: normalizedProduct.name,
      brand: normalizedProduct.brand,
      description: normalizedProduct.description,
      price: {
        amount: normalizedProduct.price.amount,
        currency: normalizedProduct.price.currency
      },
      categoryId: normalizedProduct.categoryId,
      categoryName: normalizedProduct.categoryName,
      type: normalizedProduct.type,
      tags: normalizedProduct.tags || [],
      attributes: normalizedProduct.attributes || {},
      status: normalizedProduct.status,
      inventory: {
        available: totalAvailable,
        reserved: totalReserved,
        total: totalAvailable + totalReserved,
        status: stockStatus
      },
      createdAt: normalizedProduct.createdAt,
      updatedAt: normalizedProduct.updatedAt,
      qualityScore: Number(rawProduct.qualityScore ?? 0),
      variants: variants.map((v: any) => ({
        id: v.id,
        name: v.name,
        sku: v.sku,
        price: Number(v.price ?? 0),
        status: v.status,
        inventoryQuantity: v.inventoryQuantity ?? v.stock ?? null,
        quantityReserved: v.quantityReserved ?? null,
      })),
      variantId: variants[0]?.id ?? null,
    };

    // Enrich with review aggregate stats
    if (this.reviewRepository) {
      try {
        const stats = await this.reviewRepository.getAggregateStats(normalizedProduct.id);
        details.ratings = {
          average: stats.averageRating,
          count: stats.reviewCount,
          distribution: stats.ratingDistribution
        };
      } catch {
        details.ratings = { average: null, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
      }
    } else {
      details.ratings = { average: null, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
    }

    // Include media if requested
    if (request.includeMedia) {
      details.media = await this.loadProductMedia(normalizedProduct.id);
      if (details.media.length === 0 && Array.isArray(normalizedProduct.media)) {
        details.media = normalizedProduct.media;
      }
    }

    if (!details.media && Array.isArray(normalizedProduct.media)) {
      details.media = normalizedProduct.media;
    }
    if (Array.isArray(normalizedProduct.mediaUrls)) {
      details.mediaUrls = normalizedProduct.mediaUrls;
      details.thumbnailUrl = normalizedProduct.thumbnailUrl || normalizedProduct.mediaUrls[0];
    }

    // Include recommendations if requested
    if (request.includeRecommendations && this.searchService) {
      details.recommendations = await this.loadProductRecommendations(normalizedProduct);
    }

    return details;
  }

  private normalizeProductRecord(product: unknown): ProductDetails {
    const candidate = product as ProductRecord;
    const variants = Array.isArray((candidate as any).variants) ? (candidate as any).variants : [];
    const availableStock = variants.reduce((sum: number, variant: any) => sum + Math.max(0, Number(variant.inventoryQuantity ?? variant.stock ?? 0)), 0);
    const inventoryStatus = availableStock === 0 ? 'out_of_stock' : availableStock <= 10 ? 'low_stock' : 'in_stock';

    if (candidate && typeof candidate.getId === 'function' && typeof candidate.getDefaultVariant === 'function') {
      const defaultVariant = candidate.getDefaultVariant();
      return {
        id: String(candidate.getId().toString()),
        sellerId: String(candidate.getSellerId?.().toString?.() || ''),
        supplierLocationId: undefined,
        supplierLocation: undefined,
        name: candidate.getName?.() || '',
        description: candidate.getDescription?.() || '',
        price: {
          amount: Number(defaultVariant.getPrice().toNumber()),
          currency: defaultVariant.getPrice().getCurrency()
        },
        categoryId: String(candidate.getCategoryId?.()?.toString?.() || ''),
        categoryName: undefined,
        type: String(candidate.getType?.() || 'physical'),
        tags: candidate.getTags?.() || [],
        brand: undefined,
        attributes: defaultVariant.getAttributes?.() || {},
        status: String(candidate.getStatus?.()?.toString?.() || 'draft'),
        inventoryAvailable: availableStock,
        inventory: { available: availableStock, reserved: 0, total: availableStock, status: inventoryStatus },
        mediaUrls: [],
        thumbnailUrl: undefined,
        createdAt: candidate.getCreatedAt?.() ?? new Date(),
        updatedAt: candidate.getUpdatedAt?.() ?? new Date()
      };
    }

    return {
      id: String(candidate.id ?? ''),
      sellerId: String(candidate.sellerId ?? ''),
      supplierLocationId: this.resolveSupplierLocationId(candidate),
      supplierLocation: this.resolveSupplierLocation(candidate),
      name: candidate.name ?? '',
      description: candidate.description ?? '',
      price: {
        amount: Number((candidate.price && typeof candidate.price === 'object' ? candidate.price.amount : candidate.price) ?? 0),
        currency: String((candidate.price && typeof candidate.price === 'object' ? candidate.price.currency : candidate.currency) ?? 'USD')
      },
      categoryId: String(candidate.categoryId || ''),
      categoryName: candidate.categoryName ?? (candidate as any).category?.name,
      type: String(candidate.type || 'physical'),
      tags: candidate.tags || [],
      brand: candidate.brand,
      attributes: candidate.attributes || {},
      status: String(candidate.status || 'draft'),
      inventoryAvailable: availableStock,
      inventory: { available: availableStock, reserved: 0, total: availableStock, status: inventoryStatus },
      media: Array.isArray(candidate.media) ? candidate.media.map((item, index) => ({
        id: String(item.id ?? `${candidate.id || 'product'}-media-${index}`),
        url: String(item.url ?? ''),
        type: String(item.type ?? 'image'),
        order: Number(item.order ?? index),
        isPrimary: Boolean(item.isPrimary ?? index === 0)
      })) : undefined,
      mediaUrls: Array.isArray(candidate.mediaUrls)
        ? candidate.mediaUrls
        : Array.isArray(candidate.images)
          ? candidate.images
          : [],
      thumbnailUrl: String(
        candidate.thumbnailUrl
        || (Array.isArray(candidate.mediaUrls) ? candidate.mediaUrls[0] : undefined)
        || (Array.isArray(candidate.images) ? candidate.images[0] : '')
      ) || undefined,
      createdAt: candidate.createdAt ?? new Date(),
      updatedAt: candidate.updatedAt ?? new Date()
    };
  }

  private resolveSupplierLocation(candidate: ProductRecord): string | undefined {
    if (typeof candidate.supplierLocation === 'string' && candidate.supplierLocation.trim().length > 0) {
      return candidate.supplierLocation.trim();
    }

    const metadataLocation = candidate.seoMetadata?.supplierLocation;
    if (typeof metadataLocation === 'string' && metadataLocation.trim().length > 0) {
      return metadataLocation.trim();
    }

    return undefined;
  }

  private resolveSupplierLocationId(candidate: ProductRecord): string | undefined {
    if (typeof candidate.supplierLocationId === 'string' && candidate.supplierLocationId.trim().length > 0) {
      return candidate.supplierLocationId.trim();
    }

    const metadataLocationId = candidate.seoMetadata?.supplierLocationId;
    if (typeof metadataLocationId === 'string' && metadataLocationId.trim().length > 0) {
      return metadataLocationId.trim();
    }

    return undefined;
  }

  private async loadProductMedia(productId: string): Promise<Array<{
    id: string;
    url: string;
    type: string;
    order: number;
  }>> {
    try {
      const media = (await this.mediaRepository.findByProduct(productId)) as Array<{
        id?: string;
        url?: string;
        type?: string;
        order?: number;
      }>;

      return media
        .slice()
        .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0))
        .map(m => ({
          id: String(m.id ?? ''),
          url: String(m.url ?? ''),
          type: m.type || 'unknown',
          order: Number(m.order ?? 0)
        }));
    } catch (error) {
      console.warn('Failed to load product media:', error);
      return [];
    }
  }



  private async loadProductRecommendations(product: ProductRecord): Promise<Array<{
    productId: string;
    name: string;
    price: number;
    relevanceScore: number;
  }>> {
    if (!this.searchService) {
      return [];
    }

    try {
      // Search for similar products using basic criteria
      const searchQuery = `${product.name} ${product.tags?.join(' ') || ''}`.trim();
      const searchResults = await this.searchService.search(searchQuery, {
        category: product.categoryId,
        excludeProduct: product.id,
        limit: 5
      }, { limit: 5 });

      return this.normalizeSearchResults(searchResults).map((result: SearchResultRecord) => ({
        productId: result.id || '',
        name: result.name || 'Unknown Product',
        price: result.price || 0,
        relevanceScore: result.score || 0
      }));

    } catch (error) {
      console.warn('Failed to load product recommendations:', error);
      return [];
    }
  }

  private normalizeSearchResults(result: unknown): SearchResultRecord[] {
    if (Array.isArray(result)) {
      return result as SearchResultRecord[];
    }

    const record = result as { results?: unknown; products?: unknown };

    if (Array.isArray(record?.results)) {
      return record.results as SearchResultRecord[];
    }

    if (Array.isArray(record?.products)) {
      return record.products as SearchResultRecord[];
    }

    return [];
  }
}

/**
 * Get Products by Seller Use Case
 * Retrieves all products for a specific seller
 */
export class GetProductsBySellerUseCase {
  constructor(
    private readonly productRepository: ProductRepository
  ) {}

  async execute(sellerId: string, options: {
    status?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{
    products: ProductDetails[];
    total: number;
    status: 'success' | 'error';
    message: string;
  }> {
    try {
      if (!sellerId) {
        return {
          products: [],
          total: 0,
          status: 'error',
          message: 'Seller ID is required'
        };
      }

      // Get products by seller
      const products = await this.productRepository.findBySeller(sellerId);

      // Filter by status if specified
      let filteredProducts = products;
      if (options.status) {
        filteredProducts = products.filter(p => p.status === options.status);
      }

      // Apply pagination
      const total = filteredProducts.length;
      const startIndex = options.offset || 0;
      const limit = options.limit || 50;
      const paginatedProducts = filteredProducts.slice(startIndex, startIndex + limit);

      // Build product details
      const productDetails: ProductDetails[] = [];
      for (const product of paginatedProducts) {
        const details = await this.buildBasicProductDetails(product);
        productDetails.push(details);
      }

      return {
        products: productDetails,
        total,
        status: 'success',
        message: 'Products retrieved successfully'
      };

    } catch (error) {
      console.error('GetProductsBySellerUseCase error:', error);

      return {
        products: [],
        total: 0,
        status: 'error',
        message: 'Internal error occurred while retrieving products'
      };
    }
  }

  private async buildBasicProductDetails(product: ProductRecord): Promise<ProductDetails> {
    return this.normalizeProductRecord(product);
  }

  private normalizeProductRecord(product: ProductRecord): ProductDetails {
    const candidate = product as ProductRecord;
    const variants = Array.isArray((candidate as any).variants) ? (candidate as any).variants : [];
    const availableStock = variants.reduce((sum: number, variant: any) => sum + Math.max(0, Number(variant.inventoryQuantity ?? variant.stock ?? 0)), 0);
    const inventoryStatus = availableStock === 0 ? 'out_of_stock' : availableStock <= 10 ? 'low_stock' : 'in_stock';

    if (candidate && typeof candidate.getId === 'function' && typeof candidate.getDefaultVariant === 'function') {
      const defaultVariant = candidate.getDefaultVariant();
      return {
        id: String(candidate.getId().toString()),
        sellerId: String(candidate.getSellerId?.().toString?.() || ''),
        supplierLocationId: undefined,
        supplierLocation: undefined,
        name: candidate.getName?.() || '',
        description: candidate.getDescription?.() || '',
        price: {
          amount: Number(defaultVariant.getPrice().toNumber()),
          currency: defaultVariant.getPrice().getCurrency()
        },
        categoryId: String(candidate.getCategoryId?.()?.toString?.() || ''),
        categoryName: undefined,
        type: String(candidate.getType?.() || 'physical'),
        tags: candidate.getTags?.() || [],
        brand: undefined,
        attributes: defaultVariant.getAttributes?.() || {},
        status: String(candidate.getStatus?.()?.toString?.() || 'draft'),
        inventoryAvailable: availableStock,
        inventory: { available: availableStock, reserved: 0, total: availableStock, status: inventoryStatus },
        mediaUrls: [],
        thumbnailUrl: undefined,
        createdAt: candidate.getCreatedAt?.() ?? new Date(),
        updatedAt: candidate.getUpdatedAt?.() ?? new Date()
      };
    }

    return {
      id: String(candidate.id ?? ''),
      sellerId: String(candidate.sellerId ?? ''),
      supplierLocationId: this.resolveSupplierLocationId(candidate),
      supplierLocation: this.resolveSupplierLocation(candidate),
      name: candidate.name ?? '',
      description: candidate.description ?? '',
      price: {
        amount: Number((candidate.price && typeof candidate.price === 'object' ? candidate.price.amount : candidate.price) ?? 0),
        currency: String((candidate.price && typeof candidate.price === 'object' ? candidate.price.currency : candidate.currency) ?? 'USD')
      },
      categoryId: String(candidate.categoryId || ''),
      categoryName: candidate.categoryName ?? (candidate as any).category?.name,
      type: String(candidate.type || 'physical'),
      tags: candidate.tags || [],
      brand: candidate.brand,
      attributes: candidate.attributes || {},
      status: String(candidate.status || 'draft'),
      inventoryAvailable: availableStock,
      inventory: { available: availableStock, reserved: 0, total: availableStock, status: inventoryStatus },
      media: Array.isArray(candidate.media) ? candidate.media.map((item, index) => ({
        id: String(item.id ?? `${candidate.id || 'product'}-media-${index}`),
        url: String(item.url ?? ''),
        type: String(item.type ?? 'image'),
        order: Number(item.order ?? index),
        isPrimary: Boolean(item.isPrimary ?? index === 0)
      })) : undefined,
      mediaUrls: Array.isArray(candidate.mediaUrls)
        ? candidate.mediaUrls
        : Array.isArray(candidate.images)
          ? candidate.images
          : [],
      thumbnailUrl: String(
        candidate.thumbnailUrl
        || (Array.isArray(candidate.mediaUrls) ? candidate.mediaUrls[0] : undefined)
        || (Array.isArray(candidate.images) ? candidate.images[0] : '')
      ) || undefined,
      createdAt: candidate.createdAt ?? new Date(),
      updatedAt: candidate.updatedAt ?? new Date()
    };
  }

  private resolveSupplierLocation(candidate: ProductRecord): string | undefined {
    if (typeof candidate.supplierLocation === 'string' && candidate.supplierLocation.trim().length > 0) {
      return candidate.supplierLocation.trim();
    }

    const metadataLocation = candidate.seoMetadata?.supplierLocation;
    if (typeof metadataLocation === 'string' && metadataLocation.trim().length > 0) {
      return metadataLocation.trim();
    }

    return undefined;
  }

  private resolveSupplierLocationId(candidate: ProductRecord): string | undefined {
    if (typeof candidate.supplierLocationId === 'string' && candidate.supplierLocationId.trim().length > 0) {
      return candidate.supplierLocationId.trim();
    }

    const metadataLocationId = candidate.seoMetadata?.supplierLocationId;
    if (typeof metadataLocationId === 'string' && metadataLocationId.trim().length > 0) {
      return metadataLocationId.trim();
    }

    return undefined;
  }
}
