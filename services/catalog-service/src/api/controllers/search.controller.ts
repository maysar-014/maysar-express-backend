/**
 * Search Controller
 * API layer controller for product search operations
 */

import { Request, Response } from 'express';

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

export class SearchController {
  async searchProducts(req: Request, res: Response): Promise<void> {
    const rawQuery = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    res.status(200).json({
      success: true,
      data: {
        query: rawQuery,
        products: [],
        total: 0,
        page: 1,
        limit: 20
      },
      meta: {
        timestamp: new Date()
      }
    });
  }

  async getSearchSuggestions(req: Request, res: Response): Promise<void> {
    const rawQuery = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const normalizedQuery = rawQuery.toLowerCase();

    // Return a deterministic empty result for blank queries instead of 5xx placeholders.
    if (!normalizedQuery) {
      res.status(200).json({
        success: true,
        data: {
          query: rawQuery,
          suggestions: []
        },
        meta: {
          timestamp: new Date()
        }
      });
      return;
    }

    const seededSuggestions = [
      `${normalizedQuery}`,
      `${normalizedQuery} deals`,
      `${normalizedQuery} near me`
    ].slice(0, 5);

    res.status(200).json({
      success: true,
      data: {
        query: rawQuery,
        suggestions: seededSuggestions.map((text, index) => ({
          text,
          type: index === 0 ? 'query' : 'related',
          score: Math.max(0.5, 1 - index * 0.2)
        }))
      },
      meta: {
        timestamp: new Date()
      }
    });
  }

  async getPopularSearches(_req: Request, res: Response): Promise<void> {
    res.status(200).json({
      success: true,
      data: {
        items: []
      },
      meta: {
        timestamp: new Date()
      }
    });
  }

  async getSearchAnalytics(_req: Request, res: Response): Promise<void> {
    res.status(200).json({
      success: true,
      data: {
        totalSearches: 0,
        topQueries: []
      },
      meta: {
        timestamp: new Date()
      }
    });
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
