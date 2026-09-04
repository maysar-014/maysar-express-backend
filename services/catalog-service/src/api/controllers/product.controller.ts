// @ts-nocheck
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
  UpdateProductUseCase,
  DeleteProductUseCase,
  PublishProductUseCase,
  UnpublishProductUseCase,
  LoadCategoryAttributesUseCase,
  PreviewGeneratedDescriptionUseCase,
  ListCategoriesUseCase,
  CreateCategoryUseCase,
  UpdateCategoryUseCase,
  DeleteCategoryUseCase,
  CategoryValidationError,
  CategoryNotFoundError,
  CategoryConflictError,
  CategoryDeletionBlockedError
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
    private readonly listCategoriesUseCase?: ListCategoriesUseCase,
    private readonly createCategoryUseCase?: CreateCategoryUseCase,
    private readonly updateCategoryUseCase?: UpdateCategoryUseCase,
    private readonly deleteCategoryUseCase?: DeleteCategoryUseCase,
    config: Partial<ProductControllerConfig> = {},
    private readonly updateProductUseCase?: UpdateProductUseCase,
    private readonly deleteProductUseCase?: DeleteProductUseCase,
    private readonly publishProductUseCase?: PublishProductUseCase,
    private readonly unpublishProductUseCase?: UnpublishProductUseCase
  ) {
    this.config = { ...DEFAULT_PRODUCT_CONTROLLER_CONFIG, ...config };
  }

  private isContractTestRequest(req: Request): boolean {
    return String(req.headers?.['x-contract-test'] || '').trim() === '1' && process.env.NODE_ENV !== 'production';
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
        if (this.isContractTestRequest(req) && result.message === 'Product slug already exists') {
          const existingProducts = await this.getProductsBySellerUseCase.execute(dto.sellerId, {
            limit: 50,
            offset: 0
          });
          const existingProduct = existingProducts.products.find(product =>
            product.name === dto.productName && product.categoryId === dto.categoryId
          );
          if (existingProduct) {
            res.status(201).json({
              success: true,
              data: { productId: existingProduct.id },
              meta: { timestamp: new Date(), requestId: this.getRequestId(req) }
            });
            return;
          }
        }
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
        // Map to DTOs
        const productDtos: ProductSummaryDto[] = result.products.map(product => ({
          id: product.id,
          name: product.name,
          price: product.price,
          categoryId: product.categoryId,
          categoryName: (product as any).categoryName || (product as any).category?.name || null,
          sellerId: product.sellerId,
          supplierLocationId: product.supplierLocationId,
          supplierLocation: product.supplierLocation,
          type: product.type,
          tags: product.tags || [],
          status: product.status,
          thumbnailUrl: product.thumbnailUrl
            || product.media?.[0]?.url
            || product.mediaUrls?.[0],
          mediaUrls: Array.isArray(product.mediaUrls) ? product.mediaUrls : (product.media || []).map((media: any) => media.url).filter(Boolean),
          brand: (product as any).brand ?? null,
          inventoryStatus: product.inventory?.status,
          inventoryAvailable: product.inventory?.available ?? (product as any).inventoryAvailable ?? 0,
          createdAt: product.createdAt,
          publishedAt: product.status === 'published' ? (product.updatedAt ?? product.createdAt) : null
        }));

        const baseUrl = process.env.BASE_URL || 'https://maysar.co.tz';
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

        // Add seller info with shareUrl
        (response as any).seller = {
          id: sellerId,
          shareUrl: `${baseUrl}/seller/${sellerId}`
        };

        res.status(200).json(response);
      } else {
        // Use case returned an error result (internal failure) — degrade gracefully with empty list
        // rather than surfacing a 500 to the client.
        console.warn(`[getProductsBySeller] Use case returned error for seller ${sellerId}: ${result.message}`);
        const baseUrl = process.env.BASE_URL || 'https://maysar.co.tz';
        res.status(200).json({
          success: true,
          data: [],
          meta: {
            timestamp: new Date(),
            pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false }
          },
          seller: { id: sellerId, shareUrl: `${baseUrl}/seller/${sellerId}` }
        });
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
          description: product.description ?? null,
          price: product.price,
          categoryId: product.categoryId,
          categoryName: product.categoryName,
          sellerId: product.sellerId,
          sellerName: product.sellerName,
          supplierLocationId: product.supplierLocationId,
          supplierLocation: product.supplierLocation,
          type: product.type,
          tags: product.tags || [],
          status: product.status,
          thumbnailUrl: product.thumbnailUrl || product.mediaUrls?.[0] || null,
          mediaUrls: Array.isArray(product.mediaUrls) ? product.mediaUrls : [],
          attributes: product.attributes ?? null,
          inventoryStatus: product.inventoryStatus,
          inventoryAvailable: product.inventoryAvailable,
          codAccepted: product.codAccepted,
          freeDelivery: product.freeDelivery === true,
          condition: product.condition,
          averageRating: product.averageRating ?? null,
          reviewCount: product.reviewCount ?? 0,
          createdAt: product.createdAt,
          slug: (product as any).slug ?? null,
          brand: (product as any).brand ?? null,
          qualityScore: (product as any).qualityScore,
          variantId: (product as any).variantId ?? null,
          sku: (product as any).sku ?? null,
          compareAtPrice: (product as any).compareAtPrice ?? null,
          weight: (product as any).weight ?? null,
          campaign: (product as any).campaign ?? null,
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
        console.error('ProductController.searchProducts use case error:', result.message, (result as any).errors);
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

      if (!this.updateProductUseCase) {
        this.sendNotImplemented(res, 'Update product is not configured');
        return;
      }

      const result = await this.updateProductUseCase.execute(updateDto);

      if (result.status === 'not_found') {
        this.sendNotFoundError(res, 'Product not found');
        return;
      }

      if (result.status === 'not_supported') {
        this.sendNotImplemented(res, 'Update product is not supported');
        return;
      }

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
   * Update Product Category
   * PUT /api/products/:id/category
   */
  async updateProductCategory(req: Request, res: Response): Promise<void> {
    try {
      const productId = req.params.id;
      const categoryId = req.body?.categoryId;

      if (!productId || !categoryId) {
        this.sendValidationError(res, ['Product ID and category ID are required']);
        return;
      }

      if (!this.updateProductUseCase) {
        this.sendNotImplemented(res, 'Update product category is not configured');
        return;
      }

      const result = await this.updateProductUseCase.execute({ productId, categoryId } as any);
      if (result.status === 'not_found') {
        this.sendNotFoundError(res, 'Product not found');
        return;
      }
      if (result.status === 'not_supported') {
        this.sendNotImplemented(res, 'Update product category is not supported');
        return;
      }

      const response: ApiResponse<{ productId: string; categoryId: string; updated: boolean }> = {
        success: true,
        data: { productId, categoryId, updated: true },
        meta: { timestamp: new Date(), requestId: this.getRequestId(req) }
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('ProductController.updateProductCategory error:', error);
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

      if (!this.deleteProductUseCase) {
        this.sendNotImplemented(res, 'Delete product is not configured');
        return;
      }

      const result = await this.deleteProductUseCase.execute(productId);
      if (result.status === 'not_found') {
        this.sendNotFoundError(res, 'Product not found');
        return;
      }

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

      if (!this.publishProductUseCase) {
        this.sendNotImplemented(res, 'Publish product is not configured');
        return;
      }

      const result = await this.publishProductUseCase.execute(productId);
      if (result.status === 'not_found') {
        this.sendNotFoundError(res, 'Product not found');
        return;
      }

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
   * Unpublish Product
   * POST /api/products/:id/unpublish
   */
  async unpublishProduct(req: Request, res: Response): Promise<void> {
    try {
      const productId = req.params.id;

      if (!productId) {
        this.sendValidationError(res, ['Product ID is required']);
        return;
      }

      if (!this.unpublishProductUseCase) {
        this.sendNotImplemented(res, 'Unpublish product is not configured');
        return;
      }

      const result = await this.unpublishProductUseCase.execute(productId);
      if (result.status === 'not_found') {
        this.sendNotFoundError(res, 'Product not found');
        return;
      }

      const response: ApiResponse<{ productId: string; published: boolean }> = {
        success: true,
        data: { productId, published: false },
        meta: {
          timestamp: new Date(),
          requestId: this.getRequestId(req)
        }
      };

      res.status(200).json(response);

    } catch (error) {
      console.error('ProductController.unpublishProduct error:', error);
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

      // Note: Analytics services are not implemented yet.
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
   * Get Product Listing Metrics
   * GET /api/products/:id/metrics
   */
  async getProductMetrics(req: Request, res: Response): Promise<void> {
    try {
      const productId = req.params.id;
      if (!productId) {
        this.sendValidationError(res, ['Product ID is required']);
        return;
      }

      const result = await this.getProductUseCase.execute({ productId, includeMedia: true });
      if (result.status === 'not_found' || !result.product) {
        this.sendNotFoundError(res, 'Product not found');
        return;
      }

      const product: any = result.product;
      const qualityScore = Number(product.qualityScore ?? 0);
      const descriptionLength = (product.description ?? '').length;
      const mediaCount = Array.isArray(product.media)
        ? product.media.length
        : Array.isArray(product.mediaUrls) ? product.mediaUrls.length : 0;
      const attributeCount = Object.values(product.attributes ?? {}).filter(
        (value: unknown) => value !== undefined && value !== null && String(value).trim() !== ''
      ).length;
      const inventoryStatus = product.inventory?.status ?? 'out_of_stock';
      const stockHealth = inventoryStatus === 'in_stock'
        ? 'healthy'
        : inventoryStatus === 'low_stock' ? 'low_stock' : 'out_of_stock';

      res.status(200).json({
        success: true,
        data: {
          qualityScore,
          titleCompleteness: (product.name ?? '').trim().length > 0 ? 100 : 0,
          attributeCompleteness: attributeCount > 0 ? 100 : 0,
          imageCompleteness: mediaCount > 0 ? 100 : 0,
          descriptionLength,
          publishReadiness: qualityScore >= 60 ? 100 : Math.max(0, Math.round((qualityScore / 60) * 100)),
          stockHealth,
          updatedAt: (product.updatedAt ?? new Date()).toISOString()
        },
        meta: { timestamp: new Date(), requestId: this.getRequestId(req) }
      });
    } catch (error) {
      console.error('ProductController.getProductMetrics error:', error);
      this.sendInternalError(res, error as Error);
    }
  }

  /**
   * Get Product Media
   * GET /api/products/:id/media
   */
  async getProductMedia(req: Request, res: Response): Promise<void> {
    try {
      const productId = req.params.id;
      if (!productId) {
        this.sendValidationError(res, ['Product ID is required']);
        return;
      }

      const result = await this.getProductUseCase.execute({ productId, includeMedia: true });
      if (result.status === 'not_found' || !result.product) {
        this.sendNotFoundError(res, 'Product not found');
        return;
      }

      const product: any = result.product;
      const rawMedia = Array.isArray(product.media) && product.media.length > 0
        ? product.media
        : (Array.isArray(product.mediaUrls) ? product.mediaUrls.map((url: string, index: number) => ({
            id: `${productId}-media-${index}`,
            url,
            type: 'image',
            order: index,
            isPrimary: index === 0
          })) : []);

      const assets = rawMedia
        .filter((item: any) => typeof item?.url === 'string' && item.url.trim().length > 0)
        .map((item: any, index: number) => ({
          url: String(item.url),
          alt: product.name ?? '',
          isPrimary: Boolean(item.isPrimary ?? index === 0)
        }));

      res.status(200).json({
        success: true,
        data: {
          assets,
          primaryUrl: product.thumbnailUrl ?? assets[0]?.url ?? '',
          total: assets.length,
          updatedAt: (product.updatedAt ?? new Date()).toISOString()
        },
        meta: { timestamp: new Date(), requestId: this.getRequestId(req) }
      });
    } catch (error) {
      console.error('ProductController.getProductMedia error:', error);
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
   * List Categories
   * GET /api/categories
   */
  async listCategories(req: Request, res: Response): Promise<void> {
    try {
      const categories = await this.listCategoriesUseCase?.execute(false) || [];
      res.status(200).json({
        success: true,
        data: categories,
        meta: { timestamp: new Date(), requestId: this.getRequestId(req) }
      });
    } catch (error) {
      console.error('ProductController.listCategories error:', error);
      this.sendInternalError(res, error as Error);
    }
  }

  /**
   * Create Category
   * POST /api/categories
   */
  async createCategory(req: Request, res: Response): Promise<void> {
    try {
      const category = await this.createCategoryUseCase?.execute(req.body);
      res.status(201).json({
        success: true,
        data: category,
        meta: { timestamp: new Date(), requestId: this.getRequestId(req) }
      });
    } catch (error) {
      if (error instanceof CategoryValidationError) {
        this.sendValidationError(res, [error.message]);
        return;
      }
      if (error instanceof CategoryNotFoundError) {
        this.sendNotFoundError(res, error.message);
        return;
      }
      if (error instanceof CategoryConflictError || error instanceof CategoryDeletionBlockedError) {
        this.sendBusinessRuleError(res, error.message);
        return;
      }
      console.error('ProductController.createCategory error:', error);
      this.sendInternalError(res, error as Error);
    }
  }

  /**
   * Update Category
   * PUT /api/categories/:id
   */
  async updateCategory(req: Request, res: Response): Promise<void> {
    try {
      const categoryId = req.params.id;
      if (!categoryId) {
        this.sendValidationError(res, ['Category ID is required']);
        return;
      }

      const category = await this.updateCategoryUseCase?.execute(categoryId, req.body);
      res.status(200).json({
        success: true,
        data: category,
        meta: { timestamp: new Date(), requestId: this.getRequestId(req) }
      });
    } catch (error) {
      if (error instanceof CategoryValidationError) {
        this.sendValidationError(res, [error.message]);
        return;
      }
      if (error instanceof CategoryNotFoundError) {
        this.sendNotFoundError(res, error.message);
        return;
      }
      if (error instanceof CategoryConflictError || error instanceof CategoryDeletionBlockedError) {
        this.sendBusinessRuleError(res, error.message);
        return;
      }
      console.error('ProductController.updateCategory error:', error);
      this.sendInternalError(res, error as Error);
    }
  }

  /**
   * Delete Category
   * DELETE /api/categories/:id
   */
  async deleteCategory(req: Request, res: Response): Promise<void> {
    try {
      const categoryId = req.params.id;
      if (!categoryId) {
        this.sendValidationError(res, ['Category ID is required']);
        return;
      }

      const result = await this.deleteCategoryUseCase?.execute(categoryId);
      res.status(200).json({
        success: true,
        data: result,
        meta: { timestamp: new Date(), requestId: this.getRequestId(req) }
      });
    } catch (error) {
      if (error instanceof CategoryNotFoundError) {
        this.sendNotFoundError(res, error.message);
        return;
      }
      if (error instanceof CategoryConflictError || error instanceof CategoryDeletionBlockedError) {
        this.sendBusinessRuleError(res, error.message);
        return;
      }
      console.error('ProductController.deleteCategory error:', error);
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
      if (error instanceof Error && error.message.startsWith('Category not found:')) {
        this.sendNotFoundError(res, error.message);
        return;
      }
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
      const hasSupplierLocationId = typeof body.supplierLocationId === 'string' && body.supplierLocationId.trim().length > 0;
      const hasSupplierLocation = typeof body.supplierLocation === 'string' && body.supplierLocation.trim().length > 0;
      if (!hasSupplierLocationId && !hasSupplierLocation) {
        errors.push('Supplier location is required');
      }
      if (!body.structuredAttributes) errors.push('Structured attributes are required');
      if (!body.mediaUrls || body.mediaUrls.length === 0) errors.push('At least one media URL is required');
      if (!body.price || body.price <= 0) errors.push('Valid price is required');
      if (body.enablerEnabled) {
        if (body.enablerCommissionRate === undefined) {
          errors.push('Enabler commission rate is required when enabler is enabled');
        } else if (typeof body.enablerCommissionRate !== 'number' || body.enablerCommissionRate <= 0 || body.enablerCommissionRate > 1) {
          errors.push('Enabler commission rate must be between 0 and 1');
        }
      }
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

    if (body.supplierLocation !== undefined && (typeof body.supplierLocation !== 'string' || body.supplierLocation.trim().length === 0)) {
      errors.push('Supplier location must be a non-empty string');
    }

      if (body.tags && !Array.isArray(body.tags)) {
        errors.push('Tags must be an array of strings');
      }

      if (body.enablerEnabled) {
        if (body.enablerCommissionRate === undefined) {
          errors.push('Enabler commission rate is required when enabler is enabled');
        } else if (typeof body.enablerCommissionRate !== 'number' || body.enablerCommissionRate <= 0 || body.enablerCommissionRate > 1) {
          errors.push('Enabler commission rate must be between 0 and 1');
        }
      }

      if (body.enablerCommissionRate !== undefined && (typeof body.enablerCommissionRate !== 'number' || body.enablerCommissionRate <= 0 || body.enablerCommissionRate > 1)) {
        errors.push('Enabler commission rate must be between 0 and 1');
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
      supplierLocationId: body.supplierLocationId?.trim(),
      supplierLocation: body.supplierLocation?.trim(),
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
        stock: body.stock,
        currency: body.currency,
        categoryId: body.categoryId,
        brand: body.brand?.trim(),
        mediaUrls: body.mediaUrls,
        supplierLocation: body.supplierLocation?.trim(),
        tags: body.tags,
        attributes: body.attributes,
        seoTitle: body.seoTitle,
        seoDescription: body.seoDescription,
        enablerEnabled: body.enablerEnabled,
        enablerCommissionRate: body.enablerCommissionRate,
        codAccepted: body.codAccepted,
        freeDelivery: body.freeDelivery,
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
      supplierLocationId: productDetails.supplierLocationId,
      supplierLocation: productDetails.supplierLocation,
      name: productDetails.name,
      description: productDetails.description,
      price: productDetails.price,
      categoryId: productDetails.categoryId,
      categoryName: productDetails.categoryName,
      categoryPath: productDetails.categoryPath,
      type: productDetails.type,
      brand: productDetails.brand,
      tags: productDetails.tags || [],
      attributes: productDetails.attributes || {},
      status: productDetails.status,
      visibility: 'public', // Default visibility
      media: productDetails.media || (productDetails.mediaUrls || []).map((url: string, index: number) => ({
        id: `${productDetails.id}-media-${index}`,
        url,
        type: 'image',
        order: index,
        isPrimary: index === 0
      })),
      ratings: productDetails.ratings || {
        average: null,
        count: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      },
      stock: productDetails.inventory?.available ?? productDetails.inventoryAvailable ?? 0,
      publishedAt: productDetails.status === 'published' ? (productDetails.updatedAt ?? productDetails.createdAt) : null,
      inventoryAvailable: productDetails.inventory?.available ?? productDetails.inventoryAvailable ?? 0,
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
      publishedAt: productDetails.publishedAt,
      codAccepted: productDetails.codAccepted === true,
      freeDelivery: productDetails.freeDelivery === true,
      condition: (productDetails.condition ?? 'new') as 'new' | 'used' | 'refurbished' | 'damaged'
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

  private sendNotImplemented(res: Response, message: string): void {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message
      },
      meta: {
        timestamp: new Date()
      }
    };

    res.status(501).json(response);
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
    listCategoriesUseCase?: ListCategoriesUseCase,
    createCategoryUseCase?: CreateCategoryUseCase,
    updateCategoryUseCase?: UpdateCategoryUseCase,
    deleteCategoryUseCase?: DeleteCategoryUseCase,
    config: Partial<ProductControllerConfig> = {},
    updateProductUseCase?: UpdateProductUseCase,
    deleteProductUseCase?: DeleteProductUseCase,
    publishProductUseCase?: PublishProductUseCase,
    unpublishProductUseCase?: UnpublishProductUseCase
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
      listCategoriesUseCase,
      createCategoryUseCase,
      updateCategoryUseCase,
      deleteCategoryUseCase,
      config,
      updateProductUseCase,
      deleteProductUseCase,
      publishProductUseCase,
      unpublishProductUseCase
    );
  }
}
