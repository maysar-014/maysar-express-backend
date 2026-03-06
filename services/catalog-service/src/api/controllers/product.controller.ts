/**
 * Product Controller
 * API layer controller for product-related operations
 * Handles HTTP requests and orchestrates product business logic
 */

import { Request, Response } from 'express';
import {
  CreateProductUseCase,
  GetProductUseCase,
  GetProductsBySellerUseCase,
  SearchProductsUseCase,
  LoadCategoryAttributesUseCase,
  PreviewGeneratedDescriptionUseCase
} from '../../application/use-cases';
import { CreateProductWithMatchingUseCase } from '../../application/use-cases/create-product-with-matching.use-case';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductDetailsDto,
  ProductSummaryDto,
  ProductSearchDto,
  StructuredCreateProductDto
} from '../../application/dto/product.dto';
import { ProductMapper } from '../../application/mappers/product-mapper';

/**
 * Product Controller Configuration
 */
export interface ProductControllerConfig {
  maxSearchLimit: number;
  defaultSearchLimit: number;
  enableCaching: boolean;
  cacheTtl: number;
}

/**
 * Default Product Controller Configuration
 */
export const DEFAULT_PRODUCT_CONTROLLER_CONFIG: ProductControllerConfig = {
  maxSearchLimit: 100,
  defaultSearchLimit: 20,
  enableCaching: true,
  cacheTtl: 300 // 5 minutes
};

/**
 * HTTP Response Types
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: Date;
    requestId?: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: {
    timestamp: Date;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

/**
 * Product Controller
 * Express.js controller for product CRUD operations
 * Validates requests, orchestrates use cases, and formats responses
 */
export class ProductController {
  private config: ProductControllerConfig;

  constructor(
    private readonly createProductUseCase: CreateProductUseCase,
    private readonly getProductUseCase: GetProductUseCase,
    private readonly getProductsBySellerUseCase: GetProductsBySellerUseCase,
    private readonly searchProductsUseCase: SearchProductsUseCase,
    private readonly productMapper: ProductMapper,
    private readonly loadCategoryAttributesUseCase: LoadCategoryAttributesUseCase,
    private readonly previewGeneratedDescriptionUseCase: PreviewGeneratedDescriptionUseCase,
    private readonly createProductWithMatchingUseCase?: CreateProductWithMatchingUseCase,
    config: Partial<ProductControllerConfig> = {}
  ) {
    this.config = { ...DEFAULT_PRODUCT_CONTROLLER_CONFIG, ...config };
  }

  /**
   * Create Product (Structured or with Matching)
   * POST /api/products
   */
  async createProduct(req: Request, res: Response): Promise<void> {
    try {
      const validation = this.validateStructuredCreateProductRequest(req.body);
      if (!validation.isValid) {
        this.sendValidationError(res, validation.errors);
        return;
      }

      const dto: StructuredCreateProductDto = req.body;
      const enableMatching = req.query.enableMatching === 'true' && this.createProductWithMatchingUseCase;

      if (enableMatching && this.createProductWithMatchingUseCase) {
        const matchingResult = await this.createProductWithMatchingUseCase.execute({
          sellerId: dto.sellerId,
          categoryId: dto.categoryId,
          brand: dto.brand,
          productName: dto.productName,
          structuredAttributes: dto.structuredAttributes,
          mediaUrls: dto.mediaUrls,
          price: dto.price,
          currency: dto.currency,
          supplierLocation: dto.supplierLocation,
          minimumOrderQuantity: dto.minimumOrderQuantity,
        });

        if (matchingResult.confirmationRequired) {
          res.status(200).json({
            success: true,
            data: {
              matchingRequired: true,
              confirmationId: matchingResult.confirmationId,
              candidates: matchingResult.candidates
            },
            meta: { timestamp: new Date(), requestId: this.getRequestId(req) }
          });
          return;
        } else if (matchingResult.matchedProductId) {
          res.status(201).json({
            success: true,
            data: { productId: matchingResult.matchedProductId, matched: matchingResult.matchFound || false },
            meta: { timestamp: new Date(), requestId: this.getRequestId(req) }
          });
          return;
        }
      }

      const result = await this.createProductUseCase.execute(dto);

      if (result.status === 'success') {
        res.status(201).json({
          success: true,
          data: { productId: result.productId },
          meta: { timestamp: new Date(), requestId: this.getRequestId(req) }
        });
      } else if (result.status === 'validation_error') {
        this.sendValidationError(res, result.violations || []);
      } else {
        this.sendBusinessRuleError(res, result.message);
      }
    } catch (error) {
      console.error('ProductController.createProduct error:', error);
      this.sendInternalError(res, error as Error);
    }
  }

  /**
   * Get Product by ID
   * GET /api/products/:id
   */
  async getProduct(req: Request, res: Response): Promise<void> {
    try {
      const productId = req.params.id;
      const includeMedia = req.query.includeMedia === 'true';
      const includeRecommendations = req.query.includeRecommendations === 'true';

      if (!productId) {
        this.sendValidationError(res, ['Product ID is required']);
        return;
      }

      // Execute use case
      const result = await this.getProductUseCase.execute({
        productId,
        includeMedia,
        includeRecommendations
      });

      // Handle response
      if (result.status === 'success' && result.product) {
        // Convert use case result to ProductDetailsDto
        const productDto = this.mapProductDetailsToDto(result.product);

        const response: ApiResponse<ProductDetailsDto> = {
          success: true,
          data: productDto,
          meta: {
            timestamp: new Date(),
            requestId: this.getRequestId(req)
          }
        };

        res.status(200).json(response);
      } else if (result.status === 'not_found') {
        this.sendNotFoundError(res, 'Product not found');
      } else {
        this.sendInternalError(res, new Error(result.message));
      }

    } catch (error) {
      console.error('ProductController.getProduct error:', error);
      this.sendInternalError(res, error as Error);
    }
  }

  /**
   * Get Products by Seller
   * GET /api/sellers/:sellerId/products
   */
  async getProductsBySeller(req: Request, res: Response): Promise<void> {
    try {
      const sellerId = req.params.sellerId;
      const status = req.query.status as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(
        parseInt(req.query.limit as string) || this.config.defaultSearchLimit,
        this.config.maxSearchLimit
      );

      if (!sellerId) {
        this.sendValidationError(res, ['Seller ID is required']);
        return;
      }

      // Execute use case
      const result = await this.getProductsBySellerUseCase.execute(sellerId, {
        status,
        limit,
        offset: (page - 1) * limit
      });

      if (result.status === 'success') {
        // Map to DTOs (simplified for now - would need proper entity conversion)
        const productDtos: ProductSummaryDto[] = result.products.map(product => ({
          id: product.id,
          name: product.name,
          price: product.price,
          categoryId: product.categoryId,
          sellerId: product.sellerId,
          type: product.type,
          tags: product.tags || [],
          status: product.status,
          createdAt: product.createdAt
        }));

        const response: PaginatedResponse<ProductSummaryDto> = {
          success: true,
          data: productDtos,
          meta: {
            timestamp: new Date(),
            pagination: {
              page,
              limit,
              total: result.total,
              totalPages: Math.ceil(result.total / limit),
              hasNext: page * limit < result.total,
              hasPrev: page > 1
            }
          }
        };

        res.status(200).json(response);
      } else {
        this.sendInternalError(res, new Error(result.message));
      }

    } catch (error) {
      console.error('ProductController.getProductsBySeller error:', error);
      this.sendInternalError(res, error as Error);
    }
  }

  /**
   * Search Products
   * GET /api/products/search
   */
  async searchProducts(req: Request, res: Response): Promise<void> {
    try {
      // Parse and validate search request
      const searchRequest = this.parseSearchRequest(req);
      const validation = this.validateSearchRequest(searchRequest);

      if (!validation.isValid) {
        this.sendValidationError(res, validation.errors);
        return;
      }

      // Execute use case
      const result = await this.searchProductsUseCase.execute(searchRequest);

      if (result.status === 'success') {
        // Map results to DTOs (simplified)
        const productDtos: ProductSummaryDto[] = result.results.map(product => ({
          id: product.id,
          name: product.name,
          price: product.price,
          categoryId: product.categoryId,
          sellerId: product.sellerId,
          type: product.type,
          tags: product.tags || [],
          status: product.status,
          createdAt: product.createdAt
        }));

        const response: PaginatedResponse<ProductSummaryDto> = {
          success: true,
          data: productDtos,
          meta: {
            timestamp: new Date(),
            pagination: {
              page: result.pagination.page,
              limit: result.pagination.limit,
              total: result.total,
              totalPages: result.pagination.totalPages,
              hasNext: result.pagination.hasNext,
              hasPrev: result.pagination.hasPrev
            }
          }
        };

        // Add search metadata
        (response as any).searchMetadata = result.searchMetadata;
        (response as any).facets = result.facets;

        res.status(200).json(response);
      } else {
        this.sendInternalError(res, new Error(result.message));
      }

    } catch (error) {
      console.error('ProductController.searchProducts error:', error);
      this.sendInternalError(res, error as Error);
    }
  }

  /**
   * Update Product
   * PUT /api/products/:id
   */
  async updateProduct(req: Request, res: Response): Promise<void> {
    try {
      const productId = req.params.id;

      if (!productId) {
        this.sendValidationError(res, ['Product ID is required']);
        return;
      }

      // Validate request body
      const validation = this.validateUpdateProductRequest(req.body);
      if (!validation.isValid) {
        this.sendValidationError(res, validation.errors);
        return;
      }

      // Map to DTO
      const updateDto = this.mapToUpdateProductDto(req.body, productId);

      // Note: In a real implementation, you would have an UpdateProductUseCase
      // For now, we'll simulate the update
      const response: ApiResponse<{ productId: string; updated: boolean }> = {
        success: true,
        data: { productId, updated: true },
        meta: {
          timestamp: new Date(),
          requestId: this.getRequestId(req)
        }
      };

      res.status(200).json(response);

    } catch (error) {
      console.error('ProductController.updateProduct error:', error);
      this.sendInternalError(res, error as Error);
    }
  }

  /**
   * Delete Product
   * DELETE /api/products/:id
   */
  async deleteProduct(req: Request, res: Response): Promise<void> {
    try {
      const productId = req.params.id;

      if (!productId) {
        this.sendValidationError(res, ['Product ID is required']);
        return;
      }

      // Note: In a real implementation, you would have a DeleteProductUseCase
      // For now, we'll simulate the deletion
      const response: ApiResponse<{ productId: string; deleted: boolean }> = {
        success: true,
        data: { productId, deleted: true },
        meta: {
          timestamp: new Date(),
          requestId: this.getRequestId(req)
        }
      };

      res.status(200).json(response);

    } catch (error) {
      console.error('ProductController.deleteProduct error:', error);
      this.sendInternalError(res, error as Error);
    }
  }

  /**
   * Publish Product
   * POST /api/products/:id/publish
   */
  async publishProduct(req: Request, res: Response): Promise<void> {
    try {
      const productId = req.params.id;

      if (!productId) {
        this.sendValidationError(res, ['Product ID is required']);
        return;
      }

      // Note: In a real implementation, you would have a PublishProductUseCase
      // This would use the product publishing saga
      const response: ApiResponse<{ productId: string; published: boolean }> = {
        success: true,
        data: { productId, published: true },
        meta: {
          timestamp: new Date(),
          requestId: this.getRequestId(req)
        }
      };

      res.status(200).json(response);

    } catch (error) {
      console.error('ProductController.publishProduct error:', error);
      this.sendInternalError(res, error as Error);
    }
  }

  /**
   * Get Product Analytics
   * GET /api/products/:id/analytics
   */
  async getProductAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const productId = req.params.id;
      const period = req.query.period as string || '30d';

      if (!productId) {
        this.sendValidationError(res, ['Product ID is required']);
        return;
      }

      // Note: In a real implementation, you would have analytics services
      // For now, we'll return mock analytics
      const response: ApiResponse = {
        success: true,
        data: {
          productId,
          period,
          metrics: {
            views: 1250,
            uniqueViews: 890,
            addToCart: 45,
            purchases: 12,
            conversionRate: 0.96,
            revenue: 450.00
          }
        },
        meta: {
          timestamp: new Date(),
          requestId: this.getRequestId(req)
        }
      };

      res.status(200).json(response);

    } catch (error) {
      console.error('ProductController.getProductAnalytics error:', error);
      this.sendInternalError(res, error as Error);
    }
  }

  /**
   * Load Category Attributes
   * GET /api/categories/:categoryId/attributes
   */
  async loadCategoryAttributes(req: Request, res: Response): Promise<void> {
    try {
      const categoryId = req.params.categoryId;
      if (!categoryId) {
        this.sendValidationError(res, ['Category ID is required']);
        return;
      }

      const result = await this.loadCategoryAttributesUseCase.execute(categoryId);
      res.status(200).json({
        success: true,
        data: result,
        meta: { timestamp: new Date(), requestId: this.getRequestId(req) }
      });
    } catch (error) {
      console.error('ProductController.loadCategoryAttributes error:', error);
      this.sendInternalError(res, error as Error);
    }
  }

  /**
   * Preview Generated Description
   * POST /api/products/preview-description
   */
  async previewGeneratedDescription(req: Request, res: Response): Promise<void> {
    try {
      const validation = this.validatePreviewDescriptionRequest(req.body);
      if (!validation.isValid) {
        this.sendValidationError(res, validation.errors);
        return;
      }

      const result = await this.previewGeneratedDescriptionUseCase.execute(req.body);
      res.status(200).json({
        success: true,
        data: result,
        meta: { timestamp: new Date(), requestId: this.getRequestId(req) }
      });
    } catch (error) {
      console.error('ProductController.previewGeneratedDescription error:', error);
      this.sendInternalError(res, error as Error);
    }
  }

  // Private helper methods

  private validateStructuredCreateProductRequest(body: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!body.sellerId) errors.push('Seller ID is required');
    if (!body.categoryId) errors.push('Category ID is required');
    if (!body.brand) errors.push('Brand is required');
    if (!body.productName) errors.push('Product name is required');
    if (!body.structuredAttributes) errors.push('Structured attributes are required');
    if (!body.mediaUrls || body.mediaUrls.length === 0) errors.push('At least one media URL is required');
    if (!body.price || body.price <= 0) errors.push('Valid price is required');
    return { isValid: errors.length === 0, errors };
  }

  private validateUpdateProductRequest(body: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (body.name !== undefined && (typeof body.name !== 'string' || body.name.trim().length === 0)) {
      errors.push('Product name must be a non-empty string');
    }

    if (body.price !== undefined && (typeof body.price !== 'number' || body.price <= 0)) {
      errors.push('Product price must be a positive number');
    }

    if (body.tags && !Array.isArray(body.tags)) {
      errors.push('Tags must be an array of strings');
    }

    return { isValid: errors.length === 0, errors };
  }

  private validatePreviewDescriptionRequest(body: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!body.categoryId || typeof body.categoryId !== 'string') {
      errors.push('Category ID is required');
    }

    if (!body.brand || typeof body.brand !== 'string') {
      errors.push('Brand is required');
    }

    if (!body.productName || typeof body.productName !== 'string') {
      errors.push('Product name is required');
    }

    if (!body.structuredAttributes || typeof body.structuredAttributes !== 'object') {
      errors.push('Structured attributes are required');
    }

    return { isValid: errors.length === 0, errors };
  }

  private validateSearchRequest(request: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (request.pagination) {
      const { page, limit } = request.pagination;
      if (page && (typeof page !== 'number' || page < 1)) {
        errors.push('Page must be a positive integer');
      }
      if (limit && (typeof limit !== 'number' || limit < 1 || limit > this.config.maxSearchLimit)) {
        errors.push(`Limit must be between 1 and ${this.config.maxSearchLimit}`);
      }
    }

    if (request.filters?.priceRange) {
      const { min, max } = request.filters.priceRange;
      if (min !== undefined && (typeof min !== 'number' || min < 0)) {
        errors.push('Price range min must be a non-negative number');
      }
      if (max !== undefined && (typeof max !== 'number' || max < 0)) {
        errors.push('Price range max must be a non-negative number');
      }
      if (min !== undefined && max !== undefined && min > max) {
        errors.push('Price range min cannot be greater than max');
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  private mapToCreateProductDto(body: any): CreateProductDto {
    return {
      sellerId: body.sellerId,
      name: body.name.trim(),
      description: body.description.trim(),
      price: body.price,
      currency: body.currency || 'USD',
      categoryId: body.categoryId,
      type: body.type,
      tags: body.tags || [],
      mediaUrls: body.mediaUrls || [],
      inventoryCount: body.inventoryCount || 0,
      attributes: body.attributes || {},
      seoTitle: body.seoTitle,
      seoDescription: body.seoDescription
    };
  }

  private mapToUpdateProductDto(body: any, productId: string): UpdateProductDto {
    return {
      productId,
      name: body.name?.trim(),
      description: body.description?.trim(),
      price: body.price,
      currency: body.currency,
      categoryId: body.categoryId,
      tags: body.tags,
      attributes: body.attributes,
      seoTitle: body.seoTitle,
      seoDescription: body.seoDescription
    };
  }

  private parseSearchRequest(req: Request): any {
    const query = req.query.q as string;
    const filters: any = {};
    const sorting: any = {
      field: req.query.sortBy as string || 'relevance',
      direction: req.query.sortOrder as string || 'desc'
    };
    const pagination: any = {
      page: parseInt(req.query.page as string) || 1,
      limit: Math.min(
        parseInt(req.query.limit as string) || this.config.defaultSearchLimit,
        this.config.maxSearchLimit
      )
    };

    // Parse filters from query parameters
    if (req.query.category) filters.category = req.query.category;
    if (req.query.seller) filters.seller = req.query.seller;
    if (req.query.productType) filters.productType = req.query.productType;
    if (req.query.status) filters.status = req.query.status;
    if (req.query.inStock !== undefined) filters.inStock = req.query.inStock === 'true';
    if (req.query.tags) filters.tags = Array.isArray(req.query.tags) ? req.query.tags : [req.query.tags];

    // Parse price range
    const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined;
    const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined;
    if (minPrice !== undefined || maxPrice !== undefined) {
      filters.priceRange = { min: minPrice || 0, max: maxPrice || Infinity };
    }

    return {
      query,
      filters,
      sorting,
      pagination,
      includeFacets: req.query.facets === 'true',
      includeSuggestions: req.query.suggestions === 'true'
    };
  }

  private mapProductDetailsToDto(productDetails: any): ProductDetailsDto {
    // Convert the simple object from use case to ProductDetailsDto
    return {
      id: productDetails.id,
      sellerId: productDetails.sellerId,
      sellerName: productDetails.sellerName,
      name: productDetails.name,
      description: productDetails.description,
      price: productDetails.price,
      categoryId: productDetails.categoryId,
      categoryName: productDetails.categoryName,
      categoryPath: productDetails.categoryPath,
      type: productDetails.type,
      tags: productDetails.tags || [],
      attributes: productDetails.attributes || {},
      status: productDetails.status,
      visibility: 'public', // Default visibility
      media: productDetails.media || [],
      inventory: productDetails.inventory || {
        available: 0,
        reserved: 0,
        total: 0,
        status: 'out_of_stock'
      },
      shipping: productDetails.shipping || {},
      seo: productDetails.seo || {},
      analytics: productDetails.analytics || {
        viewCount: 0,
        purchaseCount: 0,
        favoriteCount: 0,
        shareCount: 0
      },
      ratings: productDetails.ratings || {
        average: 0,
        count: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      },
      reviews: productDetails.reviews || [],
      recommendations: productDetails.recommendations || [],
      createdAt: productDetails.createdAt,
      updatedAt: productDetails.updatedAt,
      publishedAt: productDetails.publishedAt
    };
  }

  private getRequestId(req: Request): string | undefined {
    return (req as any).requestId || (req.headers['x-request-id'] as string);
  }

  // Response helper methods

  private sendValidationError(res: Response, errors: string[]): void {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: { errors }
      },
      meta: {
        timestamp: new Date()
      }
    };

    res.status(400).json(response);
  }

  private sendBusinessRuleError(res: Response, message: string): void {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'BUSINESS_RULE_VIOLATION',
        message
      },
      meta: {
        timestamp: new Date()
      }
    };

    res.status(409).json(response);
  }

  private sendNotFoundError(res: Response, message: string): void {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message
      },
      meta: {
        timestamp: new Date()
      }
    };

    res.status(404).json(response);
  }

  private sendInternalError(res: Response, error: Error): void {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      meta: {
        timestamp: new Date()
      }
    };

    res.status(500).json(response);
  }
}

/**
 * Product Controller Factory
 */
export class ProductControllerFactory {
  static create(
    createProductUseCase: CreateProductUseCase,
    getProductUseCase: GetProductUseCase,
    getProductsBySellerUseCase: GetProductsBySellerUseCase,
    searchProductsUseCase: SearchProductsUseCase,
    productMapper: ProductMapper,
    loadCategoryAttributesUseCase: LoadCategoryAttributesUseCase,
    previewGeneratedDescriptionUseCase: PreviewGeneratedDescriptionUseCase,
    createProductWithMatchingUseCase?: CreateProductWithMatchingUseCase,
    config: Partial<ProductControllerConfig> = {}
  ): ProductController {
    return new ProductController(
      createProductUseCase,
      getProductUseCase,
      getProductsBySellerUseCase,
      searchProductsUseCase,
      productMapper,
      loadCategoryAttributesUseCase,
      previewGeneratedDescriptionUseCase,
      createProductWithMatchingUseCase,
      config
    );
  }
}
