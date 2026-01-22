/**
 * Search Controller
 * API layer controller for product search operations
 * Handles HTTP requests for product discovery and search functionality
 */

import { Request, Response } from 'express';

/**
 * HTTP Response Types for Search Operations
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
  };
}

/**
 * Search Controller
 * Express.js controller for product search operations
 */
export class SearchController {

  /**
   * Search Products
   * GET /api/products/search
   */
  async searchProducts(req: Request, res: Response): Promise<void> {
    try {
      const {
        q: query,
        category,
        seller,
        minPrice,
        maxPrice,
        sortBy = 'relevance',
        sortOrder = 'desc',
        page = 1,
        limit = 20
      } = req.query;

      // Basic validation
      const pageNum = parseInt(page as string) || 1;
      const limitNum = Math.min(parseInt(limit as string) || 20, 100);

      if (pageNum < 1) {
        this.sendValidationError(res, ['Page must be greater than 0']);
        return;
      }

      // Mock search results
      const mockProducts = [
        {
          id: 'prod-1',
          name: 'Wireless Headphones',
          description: 'High-quality wireless headphones',
          price: { amount: 99.99, currency: 'USD' },
          categoryId: 'electronics',
          sellerId: 'seller-1',
          type: 'physical',
          tags: ['electronics', 'audio'],
          status: 'active',
          relevanceScore: 0.95,
          thumbnailUrl: 'https://example.com/headphones.jpg'
        },
        {
          id: 'prod-2',
          name: 'Bluetooth Speaker',
          description: 'Portable Bluetooth speaker',
          price: { amount: 49.99, currency: 'USD' },
          categoryId: 'electronics',
          sellerId: 'seller-2',
          type: 'physical',
          tags: ['electronics', 'audio', 'portable'],
          status: 'active',
          relevanceScore: 0.88,
          thumbnailUrl: 'https://example.com/speaker.jpg'
        }
      ];

      // Apply filters (simplified)
      let filteredProducts = mockProducts;

      if (category) {
        filteredProducts = filteredProducts.filter(p => p.categoryId === category);
      }

      if (seller) {
        filteredProducts = filteredProducts.filter(p => p.sellerId === seller);
      }

      if (minPrice) {
        const min = parseFloat(minPrice as string);
        filteredProducts = filteredProducts.filter(p => p.price.amount >= min);
      }

      if (maxPrice) {
        const max = parseFloat(maxPrice as string);
        filteredProducts = filteredProducts.filter(p => p.price.amount <= max);
      }

      // Apply sorting
      filteredProducts.sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
          case 'price':
            comparison = a.price.amount - b.price.amount;
            break;
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
          case 'relevance':
          default:
            comparison = (b.relevanceScore || 0) - (a.relevanceScore || 0);
            break;
        }
        return sortOrder === 'desc' ? -comparison : comparison;
      });

      // Apply pagination
      const total = filteredProducts.length;
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;
      const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

      // Mock facets
      const facets = {
        categories: [
          { id: 'electronics', name: 'Electronics', count: 25 },
          { id: 'clothing', name: 'Clothing', count: 18 }
        ],
        priceRanges: [
          { range: '$0 - $50', count: 15 },
          { range: '$50 - $100', count: 12 },
          { range: '$100+', count: 8 }
        ],
        productTypes: [
          { type: 'physical', count: 30 },
          { type: 'digital', count: 5 }
        ],
        tags: [
          { tag: 'electronics', count: 25 },
          { tag: 'audio', count: 15 },
          { tag: 'portable', count: 8 }
        ]
      };

      const result = {
        results: paginatedProducts,
        total,
        facets,
        pagination: {
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
          hasNext: endIndex < total,
          hasPrev: pageNum > 1
        },
        searchMetadata: {
          query: query || '',
          executionTime: 45,
          totalResults: total
        }
      };

      const response: ApiResponse = {
        success: true,
        data: result,
        meta: {
          timestamp: new Date(),
          requestId: this.getRequestId(req)
        }
      };

      res.status(200).json(response);

    } catch (error) {
      console.error('SearchController.searchProducts error:', error);
      this.sendInternalError(res, error as Error);
    }
  }

  /**
   * Get Search Suggestions
   * GET /api/search/suggestions
   */
  async getSearchSuggestions(req: Request, res: Response): Promise<void> {
    try {
      const { q: query, limit = 5 } = req.query;

      if (!query || typeof query !== 'string') {
        this.sendValidationError(res, ['Query parameter is required']);
        return;
      }

      // Mock suggestions
      const suggestions = [
        'wireless headphones',
        'bluetooth speaker',
        'laptop stand',
        'usb cable',
        'phone case'
      ].filter(suggestion =>
        suggestion.toLowerCase().includes(query.toLowerCase())
      ).slice(0, parseInt(limit as string) || 5);

      const response: ApiResponse = {
        success: true,
        data: { suggestions, query },
        meta: {
          timestamp: new Date(),
          requestId: this.getRequestId(req)
        }
      };

      res.status(200).json(response);

    } catch (error) {
      console.error('SearchController.getSearchSuggestions error:', error);
      this.sendInternalError(res, error as Error);
    }
  }

  /**
   * Get Popular Searches
   * GET /api/search/popular
   */
  async getPopularSearches(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 10 } = req.query;

      // Mock popular searches
      const popularSearches = [
        { term: 'wireless headphones', count: 1250 },
        { term: 'laptop', count: 980 },
        { term: 'phone case', count: 875 },
        { term: 'bluetooth speaker', count: 720 },
        { term: 'usb cable', count: 650 }
      ].slice(0, parseInt(limit as string) || 10);

      const response: ApiResponse = {
        success: true,
        data: { popularSearches },
        meta: {
          timestamp: new Date(),
          requestId: this.getRequestId(req)
        }
      };

      res.status(200).json(response);

    } catch (error) {
      console.error('SearchController.getPopularSearches error:', error);
      this.sendInternalError(res, error as Error);
    }
  }

  /**
   * Get Search Analytics
   * GET /api/search/analytics
   */
  async getSearchAnalytics(req: Request, res: Response): Promise<void> {
    try {
      // Mock analytics
      const analytics = {
        totalSearches: 15420,
        uniqueQueries: 3250,
        averageResultsPerSearch: 12.5,
        conversionRate: 0.085,
        topSearches: [
          { query: 'wireless headphones', searches: 1250, conversions: 125 },
          { query: 'laptop', searches: 980, conversions: 98 },
          { query: 'phone case', searches: 875, conversions: 70 }
        ],
        noResultsRate: 0.12,
        period: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: new Date()
        }
      };

      const response: ApiResponse = {
        success: true,
        data: analytics,
        meta: {
          timestamp: new Date(),
          requestId: this.getRequestId(req)
        }
      };

      res.status(200).json(response);

    } catch (error) {
      console.error('SearchController.getSearchAnalytics error:', error);
      this.sendInternalError(res, error as Error);
    }
  }

  private getRequestId(req: Request): string | undefined {
    return (req as any).requestId || (req.headers['x-request-id'] as string);
  }

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
