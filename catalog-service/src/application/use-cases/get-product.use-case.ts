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
import { ProductId } from '../../domain/value-objects/ids.value-object';

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
  attributes: Record<string, any>;
  status: string;
  media?: Array<{
    id: string;
    url: string;
    type: string;
    order: number;
  }>;
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

  private async buildProductDetails(product: any, request: GetProductRequest): Promise<ProductDetails> {
    const details: ProductDetails = {
      id: product.id,
      sellerId: product.sellerId,
      name: product.name,
      description: product.description,
      price: {
        amount: product.price.amount,
        currency: product.price.currency
      },
      categoryId: product.categoryId,
      type: product.type,
      tags: product.tags || [],
      attributes: product.attributes || {},
      status: product.status,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    };

    // Include media if requested
    if (request.includeMedia) {
      details.media = await this.loadProductMedia(product.id);
    }



    // Include recommendations if requested
    if (request.includeRecommendations && this.searchService) {
      details.recommendations = await this.loadProductRecommendations(product);
    }

    return details;
  }

  private async loadProductMedia(productId: string): Promise<Array<{
    id: string;
    url: string;
    type: string;
    order: number;
  }>> {
    try {
      const media = await this.mediaRepository.findByProduct(productId);
      return media
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(m => ({
          id: m.id,
          url: m.url,
          type: m.type || 'unknown',
          order: m.order || 0
        }));
    } catch (error) {
      console.warn('Failed to load product media:', error);
      return [];
    }
  }



  private async loadProductRecommendations(product: any): Promise<Array<{
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

      return searchResults.map((result: any) => ({
        productId: result.id,
        name: result.name || 'Unknown Product',
        price: result.price || 0,
        relevanceScore: result.score || 0
      }));

    } catch (error) {
      console.warn('Failed to load product recommendations:', error);
      return [];
    }
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

  private async buildBasicProductDetails(product: any): Promise<ProductDetails> {
    return {
      id: product.id,
      sellerId: product.sellerId,
      name: product.name,
      description: product.description,
      price: {
        amount: product.price.amount,
        currency: product.price.currency
      },
      categoryId: product.categoryId,
      type: product.type,
      tags: product.tags || [],
      attributes: product.attributes || {},
      status: product.status,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    };
  }
}
