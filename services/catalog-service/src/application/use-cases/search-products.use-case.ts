/**
 * Search Products Use Case
 * Application layer orchestration for product search
 * Coordinates domain objects to fulfill the search products business use case
 */

import {
  ProductRepository,
  CategoryRepository,
  SearchService
} from '../../domain/interfaces';
import { ProductReviewRepository } from '../../domain/repositories/product-review.repository.interface';
import type { CampaignEnrichmentService } from '../../infrastructure/services/campaign-enrichment.service';

export interface SearchProductsRequest {
  query?: string;
  filters: {
    category?: string;
    seller?: string;
    priceRange?: {
      min: number;
      max: number;
    };
    productType?: string;
    tags?: string[];
    inStock?: boolean;
    status?: string;
  };
  sorting: {
    field: 'relevance' | 'price' | 'rating' | 'newest' | 'popularity';
    direction: 'asc' | 'desc';
  };
  pagination: {
    page: number;
    limit: number;
  };
}

export interface SearchResult {
  id: string;
  name: string;
  description: string;
  price: {
    amount: number;
    currency: string;
  };
  categoryId: string;
  categoryName?: string;
  sellerId: string;
  supplierLocationId?: string;
  supplierLocation?: string;
  type: string;
  tags: string[];
  status: string;
  mediaUrls?: string[];
  thumbnailUrl?: string;
  relevanceScore?: number;
  inventoryStatus?: 'in_stock' | 'low_stock' | 'out_of_stock';
  inventoryAvailable?: number;
  codAccepted?: boolean;
  freeDelivery?: boolean;
  condition?: 'new' | 'used' | 'refurbished' | 'damaged';
  averageRating?: number | null;
  reviewCount?: number;
  createdAt: Date;
  /** Present when the product is covered by an active campaign */
  campaign?: import('../dto/product.dto').ProductCampaignDto | null;
}

export interface SearchProductsResponse {
  results: SearchResult[];
  total: number;
  facets: {
    categories: Array<{ id: string; name: string; count: number }>;
    priceRanges: Array<{ range: string; count: number }>;
    productTypes: Array<{ type: string; count: number }>;
    tags: Array<{ tag: string; count: number }>;
  };
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  searchMetadata: {
    query: string;
    executionTime: number;
    totalResults: number;
  };
  status: 'success' | 'error';
  message: string;
}

/**
 * Search Products Use Case
 * Orchestrates product search using domain services and repositories
 * Provides faceted search with filtering, sorting, and pagination
 */
export class SearchProductsUseCase {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly searchService: SearchService,
    private readonly reviewRepository?: ProductReviewRepository,
    private readonly campaignEnrichment?: CampaignEnrichmentService
  ) {}

  async execute(request: SearchProductsRequest): Promise<SearchProductsResponse> {
    const startTime = Date.now();

    try {
      // Validate request
      const validation = this.validateRequest(request);
      if (!validation.isValid) {
        return this.createErrorResponse('Invalid search request', validation.errors);
      }

      // Execute search
      const searchResults = await this.performSearch(request);

      // Apply filters and sorting
      const filteredResults = await this.applyFilters(searchResults, request.filters);

      // Sort results
      const sortedResults = this.applySorting(filteredResults, request.sorting);

      // Apply pagination
      const paginatedResults = this.applyPagination(sortedResults, request.pagination);

      // Enrich with review aggregate stats (averageRating, reviewCount)
      let enrichedResults = paginatedResults.results;
      if (this.reviewRepository) {
        try {
          const statsMap = new Map<string, { averageRating: number | null; reviewCount: number }>();
          await Promise.all(
            enrichedResults.map(async (product) => {
              const stats = await this.reviewRepository!.getAggregateStats(product.id);
              statsMap.set(product.id, {
                averageRating: stats.averageRating,
                reviewCount: stats.reviewCount
              });
            })
          );
          enrichedResults = enrichedResults.map(product => ({
            ...product,
            averageRating: statsMap.get(product.id)?.averageRating ?? null,
            reviewCount: statsMap.get(product.id)?.reviewCount ?? 0
          }));
        } catch {
          // Non-fatal — proceed without review stats
        }
      }

      // Build facets
      const facets = await this.buildFacets(sortedResults, request.filters);

      // Enrich with active campaign data (isOnCampaign, discountedPrice, etc.)
      if (this.campaignEnrichment && enrichedResults.length > 0) {
        try {
          const campaignMap = await this.campaignEnrichment.fetchActiveCampaigns(
            enrichedResults.map(p => ({
              id: p.id,
              categoryId: p.categoryId,
              price: p.price,
            }))
          );
          if (campaignMap.size > 0) {
            enrichedResults = enrichedResults.map(product => ({
              ...product,
              campaign: campaignMap.get(product.id) ?? null,
            }));
          }
        } catch {
          // Non-fatal — proceed without campaign data
        }
      }

      // Build response
      const response: SearchProductsResponse = {
        results: enrichedResults,
        total: paginatedResults.total,
        facets,
        pagination: {
          page: request.pagination.page,
          limit: request.pagination.limit,
          totalPages: Math.ceil(paginatedResults.total / request.pagination.limit),
          hasNext: request.pagination.page * request.pagination.limit < paginatedResults.total,
          hasPrev: request.pagination.page > 1
        },
        searchMetadata: {
          query: request.query || '',
          executionTime: Date.now() - startTime,
          totalResults: sortedResults.length
        },
        status: 'success',
        message: 'Search completed successfully'
      };

      return response;

    } catch (error) {
      console.error('SearchProductsUseCase error:', error);

      return this.createErrorResponse(
        'Internal error occurred during search',
        ['An unexpected error occurred while processing your search request']
      );
    }
  }

  private validateRequest(request: SearchProductsRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate pagination
    if (request.pagination.page < 1) {
      errors.push('Page number must be greater than 0');
    }

    if (request.pagination.limit < 1 || request.pagination.limit > 100) {
      errors.push('Limit must be between 1 and 100');
    }

    // Validate price range
    if (request.filters.priceRange) {
      const { min, max } = request.filters.priceRange;
      if (min < 0 || max < 0 || min > max) {
        errors.push('Invalid price range specified');
      }
    }

    // Validate query length
    if (request.query && request.query.length > 200) {
      errors.push('Search query must be less than 200 characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private async performSearch(request: SearchProductsRequest): Promise<any[]> {
    if (request.filters.category) {
      try {
        const category = await this.categoryRepository.findById(request.filters.category);
        if (!category) {
          return [];
        }
      } catch (error) {
        console.warn('Category lookup failed during search, returning empty result set:', error);
        return [];
      }
    }

    try {
      if (request.query && request.query.trim()) {
        const searchResults = await this.searchService.search(
          request.query,
          this.buildSearchFilters(request.filters),
          {
            limit: request.pagination.limit,
            offset: (request.pagination.page - 1) * request.pagination.limit,
            sortBy: 'relevance'
          }
        );

        const rawHits = this.normalizeSearchResults(searchResults);

        // Meilisearch returns raw indexed docs without enriched variants/stock.
        // Re-fetch from the repository by ID to get fully enriched records.
        if (rawHits.length > 0) {
          const ids = rawHits.map((h: any) => h.id).filter(Boolean);
          try {
            const enriched = await Promise.all(ids.map((id: string) => this.productRepository.findById(id)));
            const enrichedMap = new Map(
              enriched.filter(Boolean).map((p: any) => [p.id, p])
            );
            // Preserve Meilisearch relevance order, fall back to raw hit if not found
            return rawHits.map((hit: any) => enrichedMap.get(hit.id) ?? hit);
          } catch {
            // If re-fetch fails, return raw hits (inventory will show out_of_stock)
            return rawHits;
          }
        }

        return rawHits;
      }

      return this.normalizeSearchResults(await this.productRepository.search(
        this.buildRepositoryFilters(request.filters),
        { 
          limit: request.pagination.limit,
          offset: (request.pagination.page - 1) * request.pagination.limit
        }
      ));

    } catch (error) {
      console.warn('Search service error, falling back to repository:', error);
      return this.normalizeSearchResults(await this.productRepository.search(
        this.buildRepositoryFilters(request.filters),
        { 
          limit: request.pagination.limit,
          offset: (request.pagination.page - 1) * request.pagination.limit
        }
      ));
    }
  }

  private normalizeSearchResults(result: unknown): any[] {
    if (Array.isArray(result)) {
      return result;
    }

    const record = result as { results?: unknown; products?: unknown };

    if (Array.isArray(record?.results)) {
      return record.results;
    }

    if (Array.isArray(record?.products)) {
      return record.products;
    }

    return [];
  }

  private buildSearchFilters(filters: SearchProductsRequest['filters']): any {
    const searchFilters: any = {};

    if (filters.category) searchFilters.category = filters.category;
    if (filters.seller) searchFilters.seller = filters.seller;
    if (filters.productType) searchFilters.productType = filters.productType;
    if (filters.tags && filters.tags.length > 0) searchFilters.tags = filters.tags;
    if (filters.priceRange) searchFilters.priceRange = filters.priceRange;
    if (filters.status) searchFilters.status = filters.status;
    if (filters.inStock !== undefined) searchFilters.inStock = filters.inStock;

    return searchFilters;
  }

  private buildRepositoryFilters(filters: SearchProductsRequest['filters']): any {
    const repoFilters: any = {};

    if (filters.category) repoFilters.categoryId = filters.category;
    if (filters.seller) repoFilters.sellerId = filters.seller;
    if (filters.productType) repoFilters.type = filters.productType;
    if (filters.status) repoFilters.status = filters.status;
    if (filters.priceRange) {
      repoFilters.priceMin = filters.priceRange.min;
      repoFilters.priceMax = filters.priceRange.max;
    }

    return repoFilters;
  }

  private async applyFilters(results: any[], filters: SearchProductsRequest['filters']): Promise<any[]> {
    let filteredResults = results;

    // Apply price range filter
    if (filters.priceRange) {
      filteredResults = filteredResults.filter(product => {
        const price = product.price?.amount || 0;
        return price >= filters.priceRange!.min && price <= filters.priceRange!.max;
      });
    }

    // Apply tags filter
    if (filters.tags && filters.tags.length > 0) {
      filteredResults = filteredResults.filter(product =>
        filters.tags!.some(tag => product.tags?.includes(tag))
      );
    }

    // Note: Stock filtering is now handled by the search service
    // or would be implemented through event-driven inventory status updates

    return filteredResults;
  }

  private applySorting(results: any[], sorting: SearchProductsRequest['sorting']): any[] {
    return results.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sorting.field) {
        case 'price':
          aValue = a.price?.amount || 0;
          bValue = b.price?.amount || 0;
          break;
        case 'rating':
          aValue = a.averageRating || 0;
          bValue = b.averageRating || 0;
          break;
        case 'newest':
          aValue = new Date(a.createdAt || 0).getTime();
          bValue = new Date(b.createdAt || 0).getTime();
          break;
        case 'popularity':
          aValue = a.popularityScore || 0;
          bValue = b.popularityScore || 0;
          break;
        case 'relevance':
        default:
          aValue = a.score || a.relevanceScore || 0;
          bValue = b.score || b.relevanceScore || 0;
          break;
      }

      if (sorting.direction === 'desc') {
        return bValue - aValue;
      } else {
        return aValue - bValue;
      }
    });
  }

  private applyPagination(results: any[], pagination: SearchProductsRequest['pagination']): {
    results: SearchResult[];
    total: number;
  } {
    const total = results.length;
    const startIndex = (pagination.page - 1) * pagination.limit;
    const endIndex = startIndex + pagination.limit;
    const paginatedResults = results.slice(startIndex, endIndex);

    // Convert to SearchResult format
    const searchResults: SearchResult[] = paginatedResults.map(product => {
      // Calculate inventory status from enriched variant stock data
      const variants: any[] = Array.isArray(product.variants) ? product.variants : [];
      const totalAvailable = variants.reduce(
        (sum: number, v: any) => sum + Math.max(0, Number(v.inventoryQuantity ?? v.stock ?? 0)),
        0
      );
      let inventoryStatus: 'in_stock' | 'low_stock' | 'out_of_stock' = 'out_of_stock';
      if (totalAvailable > 0) {
        const reorderPoint = Number(product.reorderPoint ?? variants[0]?.reorderPoint ?? 0);
        inventoryStatus = reorderPoint > 0 && totalAvailable <= reorderPoint ? 'low_stock' : 'in_stock';
      }

      return {
        id: product.id,
        name: product.name,
        description: product.description,
        price: {
          amount: product.price?.amount || 0,
          currency: product.price?.currency || 'USD'
        },
        categoryId: product.categoryId,
        categoryName: product.categoryName ?? product.category?.name ?? undefined,
        sellerId: product.sellerId,
        sellerName: product.sellerName ?? undefined,
        supplierLocationId: product.supplierLocationId,
        supplierLocation: product.supplierLocation,
        type: product.type,
        tags: product.tags || [],
        status: product.status,
        mediaUrls: Array.isArray(product.mediaUrls)
          ? product.mediaUrls
          : Array.isArray(product.images)
            ? product.images
            : [],
        thumbnailUrl: product.thumbnailUrl
          || (Array.isArray(product.mediaUrls) ? product.mediaUrls[0] : undefined)
          || (Array.isArray(product.images) ? product.images[0] : undefined),
        relevanceScore: product.score || product.relevanceScore,
        inventoryStatus,
        inventoryAvailable: totalAvailable,
        codAccepted: product.codAccepted === true,
        freeDelivery: product.freeDelivery === true,
        condition: (product.condition ?? 'new') as 'new' | 'used' | 'refurbished' | 'damaged',
        createdAt: product.createdAt
      };
    });

    return { results: searchResults, total };
  }

  private async buildFacets(results: any[], appliedFilters: SearchProductsRequest['filters']): Promise<SearchProductsResponse['facets']> {
    const facets = {
      categories: [] as Array<{ id: string; name: string; count: number }>,
      priceRanges: [] as Array<{ range: string; count: number }>,
      productTypes: [] as Array<{ type: string; count: number }>,
      tags: [] as Array<{ tag: string; count: number }>
    };

    // Category facets
    const categoryCounts = new Map<string, number>();
    for (const product of results) {
      const categoryId = product.categoryId;
      categoryCounts.set(categoryId, (categoryCounts.get(categoryId) || 0) + 1);
    }

    for (const [categoryId, count] of categoryCounts) {
      try {
        const category = await this.categoryRepository.findById(categoryId);
        const categoryName = typeof category?.name === 'string' ? category.name : 'Unknown Category';
        facets.categories.push({
          id: categoryId,
          name: categoryName,
          count
        });
      } catch (error) {
        facets.categories.push({
          id: categoryId,
          name: 'Unknown Category',
          count
        });
      }
    }

    // Price range facets
    const priceRanges = [
      { range: '$0 - $25', min: 0, max: 25 },
      { range: '$25 - $50', min: 25, max: 50 },
      { range: '$50 - $100', min: 50, max: 100 },
      { range: '$100 - $500', min: 100, max: 500 },
      { range: '$500+', min: 500, max: Infinity }
    ];

    for (const range of priceRanges) {
      const count = results.filter(product => {
        const price = product.price?.amount || 0;
        return price >= range.min && price < range.max;
      }).length;

      facets.priceRanges.push({ range: range.range, count });
    }

    // Product type facets
    const typeCounts = new Map<string, number>();
    for (const product of results) {
      const type = product.type;
      typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
    }

    for (const [type, count] of typeCounts) {
      facets.productTypes.push({ type, count });
    }

    // Tag facets
    const tagCounts = new Map<string, number>();
    for (const product of results) {
      for (const tag of (product.tags || [])) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }

    // Get top 10 tags
    const topTags = Array.from(tagCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    for (const [tag, count] of topTags) {
      facets.tags.push({ tag, count });
    }

    return facets;
  }

  private createErrorResponse(message: string, errors: string[] = []): SearchProductsResponse {
    return {
      results: [],
      total: 0,
      facets: {
        categories: [],
        priceRanges: [],
        productTypes: [],
        tags: []
      },
      pagination: {
        page: 1,
        limit: 20,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      },
      searchMetadata: {
        query: '',
        executionTime: 0,
        totalResults: 0
      },
      status: 'error',
      message
    };
  }
}
