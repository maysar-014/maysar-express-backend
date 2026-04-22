/**
 * Get Product Use Case
 * Application layer orchestration for product retrieval
 * Coordinates domain objects to fulfill the get product business use case
 */

import {
  ProductRepository,
  MediaRepository,
  SearchService
} from '../../domain/interfaces';
type ProductRecord = {
  id?: string;
  sellerId?: string;
  name?: string;
  description?: string;
  price?: {
    amount?: number;
    currency?: string;
  } | number;
  currency?: string;
  categoryId?: string;
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
  name: string;
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
  inventory?: {
    available: number;
    reserved: number;
    status: 'in_stock' | 'low_stock' | 'out_of_stock';
  };
  recommendations?: Array<{
    productId: string;
    name: string;
    price: number;
    relevanceScore: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
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
    private readonly searchService?: SearchService
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

      // Retrieve product from repository
      const product = await this.productRepository.findById(request.productId);
      if (!product) {
        return {
          status: 'not_found',
          message: 'Product not found'
        };
      }

      // Build product details
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

    const details: ProductDetails = {
      id: normalizedProduct.id,
      sellerId: normalizedProduct.sellerId,
      name: normalizedProduct.name,
      description: normalizedProduct.description,
      price: {
        amount: normalizedProduct.price.amount,
        currency: normalizedProduct.price.currency
      },
      categoryId: normalizedProduct.categoryId,
      type: normalizedProduct.type,
      tags: normalizedProduct.tags || [],
      attributes: normalizedProduct.attributes || {},
      status: normalizedProduct.status,
      createdAt: normalizedProduct.createdAt,
      updatedAt: normalizedProduct.updatedAt
    };

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

    if (candidate && typeof candidate.getId === 'function' && typeof candidate.getDefaultVariant === 'function') {
      const defaultVariant = candidate.getDefaultVariant();
      return {
        id: String(candidate.getId().toString()),
        sellerId: String(candidate.getSellerId?.().toString?.() || ''),
        name: candidate.getName?.() || '',
        description: candidate.getDescription?.() || '',
        price: {
          amount: Number(defaultVariant.getPrice().toNumber()),
          currency: defaultVariant.getPrice().getCurrency()
        },
        categoryId: String(candidate.getCategoryId?.()?.toString?.() || ''),
        type: String(candidate.getType?.() || 'physical'),
        tags: candidate.getTags?.() || [],
        attributes: defaultVariant.getAttributes?.() || {},
        status: String(candidate.getStatus?.()?.toString?.() || 'draft'),
        mediaUrls: [],
        thumbnailUrl: undefined,
        createdAt: candidate.getCreatedAt?.() ?? new Date(),
        updatedAt: candidate.getUpdatedAt?.() ?? new Date()
      };
    }

    return {
      id: String(candidate.id ?? ''),
      sellerId: String(candidate.sellerId ?? ''),
      name: candidate.name ?? '',
      description: candidate.description ?? '',
      price: {
        amount: Number((candidate.price && typeof candidate.price === 'object' ? candidate.price.amount : candidate.price) ?? 0),
        currency: String((candidate.price && typeof candidate.price === 'object' ? candidate.price.currency : candidate.currency) ?? 'USD')
      },
      categoryId: String(candidate.categoryId || ''),
      type: String(candidate.type || 'physical'),
      tags: candidate.tags || [],
      attributes: candidate.attributes || {},
      status: String(candidate.status || 'draft'),
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

    if (candidate && typeof candidate.getId === 'function' && typeof candidate.getDefaultVariant === 'function') {
      const defaultVariant = candidate.getDefaultVariant();
      return {
        id: String(candidate.getId().toString()),
        sellerId: String(candidate.getSellerId?.().toString?.() || ''),
        name: candidate.getName?.() || '',
        description: candidate.getDescription?.() || '',
        price: {
          amount: Number(defaultVariant.getPrice().toNumber()),
          currency: defaultVariant.getPrice().getCurrency()
        },
        categoryId: String(candidate.getCategoryId?.()?.toString?.() || ''),
        type: String(candidate.getType?.() || 'physical'),
        tags: candidate.getTags?.() || [],
        attributes: defaultVariant.getAttributes?.() || {},
        status: String(candidate.getStatus?.()?.toString?.() || 'draft'),
        mediaUrls: [],
        thumbnailUrl: undefined,
        createdAt: candidate.getCreatedAt?.() ?? new Date(),
        updatedAt: candidate.getUpdatedAt?.() ?? new Date()
      };
    }

    return {
      id: String(candidate.id ?? ''),
      sellerId: String(candidate.sellerId ?? ''),
      name: candidate.name ?? '',
      description: candidate.description ?? '',
      price: {
        amount: Number((candidate.price && typeof candidate.price === 'object' ? candidate.price.amount : candidate.price) ?? 0),
        currency: String((candidate.price && typeof candidate.price === 'object' ? candidate.price.currency : candidate.currency) ?? 'USD')
      },
      categoryId: String(candidate.categoryId || ''),
      type: String(candidate.type || 'physical'),
      tags: candidate.tags || [],
      attributes: candidate.attributes || {},
      status: String(candidate.status || 'draft'),
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
}
