/**
 * Pricing Controller
 * API layer controller for pricing-related operations
 * Handles HTTP requests for pricing management, calculations, and updates
 */

import { Request, Response } from 'express';

/**
 * HTTP Response Types for Pricing Operations
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
 * Pricing Controller
 * Express.js controller for pricing operations
 */
export class PricingController {

  /**
   * Calculate Product Price
   * POST /api/pricing/calculate
   */
  async calculatePrice(req: Request, res: Response): Promise<void> {
    try {
      const { productId, basePrice, pricingRules } = req.body;

      // Basic validation
      if (!productId || typeof productId !== 'string') {
        this.sendValidationError(res, ['Product ID is required']);
        return;
      }
      if (!basePrice || typeof basePrice !== 'number' || basePrice <= 0) {
        this.sendValidationError(res, ['Valid base price is required']);
        return;
      }

      // Simple price calculation (mock implementation)
      let finalPrice = basePrice;
      const appliedRules: any[] = [];

      if (pricingRules && Array.isArray(pricingRules)) {
        for (const rule of pricingRules) {
          if (rule.type === 'percentage_discount' && rule.value) {
            const discount = (basePrice * rule.value) / 100;
            finalPrice -= discount;
            appliedRules.push({
              ruleId: rule.id || 'rule-1',
              ruleName: rule.name || 'Discount',
              discountAmount: discount,
              discountPercent: rule.value,
              priority: rule.priority || 1
            });
          }
        }
      }

      const result = {
        productId,
        basePrice,
        finalPrice: Math.max(0, finalPrice),
        currency: 'USD',
        appliedRules,
        totalDiscount: basePrice - finalPrice,
        totalDiscountPercent: basePrice > 0 ? ((basePrice - finalPrice) / basePrice) * 100 : 0
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
      console.error('PricingController.calculatePrice error:', error);
      this.sendInternalError(res, error as Error);
    }
  }

  /**
   * Update Product Price
   * PUT /api/products/:productId/pricing
   */
  async updateProductPrice(req: Request, res: Response): Promise<void> {
    try {
      const productId = req.params.productId;
      const { pricingStrategy, pricingValue, requestedBy } = req.body;

      if (!productId) {
        this.sendValidationError(res, ['Product ID is required']);
        return;
      }

      if (!pricingStrategy || !['fixed', 'percentage', 'formula'].includes(pricingStrategy)) {
        this.sendValidationError(res, ['Valid pricing strategy is required']);
        return;
      }

      if (pricingValue === undefined || typeof pricingValue !== 'number') {
        this.sendValidationError(res, ['Pricing value is required']);
        return;
      }

      // Mock pricing update
      const result = {
        productId,
        success: true,
        previousPrice: { amount: 100, currency: 'USD' },
        newPrice: { amount: pricingValue, currency: 'USD' },
        changeAmount: pricingValue - 100,
        changePercent: ((pricingValue - 100) / 100) * 100,
        pricingStrategy,
        updatedAt: new Date(),
        updatedBy: requestedBy || 'system'
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
      console.error('PricingController.updateProductPrice error:', error);
      this.sendInternalError(res, error as Error);
    }
  }

  /**
   * Bulk Update Pricing
   * POST /api/pricing/bulk-update
   */
  async bulkUpdatePricing(req: Request, res: Response): Promise<void> {
    try {
      const { productIds, pricingStrategy, pricingValue, requestedBy, requestId } = req.body;

      if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
        this.sendValidationError(res, ['Product IDs array is required']);
        return;
      }

      if (!pricingStrategy || !['fixed', 'percentage', 'formula'].includes(pricingStrategy)) {
        this.sendValidationError(res, ['Valid pricing strategy is required']);
        return;
      }

      // Mock bulk pricing update
      const successful = productIds.length;
      const failed = 0;

      const result = {
        operationId: requestId || `bulk-${Date.now()}`,
        totalProducts: productIds.length,
        successfulUpdates: successful,
        failedUpdates: failed,
        skippedProducts: 0,
        pricingStrategy,
        pricingValue,
        results: productIds.map(id => ({
          productId: id,
          success: true,
          previousPrice: { amount: 100, currency: 'USD' },
          newPrice: { amount: pricingValue, currency: 'USD' },
          changeAmount: pricingValue - 100,
          changePercent: ((pricingValue - 100) / 100) * 100,
          pricingStrategy,
          updatedAt: new Date(),
          updatedBy: requestedBy || 'system'
        })),
        errors: [],
        warnings: [],
        pricingImpact: {
          totalRevenueChange: (pricingValue - 100) * successful,
          averagePriceChangePercent: ((pricingValue - 100) / 100) * 100,
          productsAffected: successful
        },
        metadata: {
          operationId: requestId || `bulk-${Date.now()}`,
          startedAt: new Date(),
          completedAt: new Date(),
          executionTime: 100,
          requestedBy: requestedBy || 'system'
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
      console.error('PricingController.bulkUpdatePricing error:', error);
      this.sendInternalError(res, error as Error);
    }
  }

  /**
   * Get Pricing Rules
   * GET /api/pricing/rules
   */
  async getPricingRules(req: Request, res: Response): Promise<void> {
    try {
      // Mock pricing rules
      const rules = [
        {
          ruleId: 'rule-1',
          ruleType: 'percentage_discount',
          name: 'Loyalty Discount',
          description: '10% discount for loyal customers',
          value: 10,
          priority: 1,
          isActive: true,
          validFrom: new Date('2024-01-01'),
          validTo: new Date('2024-12-31')
        },
        {
          ruleId: 'rule-2',
          ruleType: 'fixed_discount',
          name: 'Bulk Purchase Discount',
          description: '$5 off for orders over $50',
          value: 5,
          priority: 2,
          isActive: true,
          validFrom: new Date('2024-01-01'),
          validTo: new Date('2024-12-31')
        }
      ];

      const response: ApiResponse = {
        success: true,
        data: rules,
        meta: {
          timestamp: new Date(),
          requestId: this.getRequestId(req)
        }
      };

      res.status(200).json(response);

    } catch (error) {
      console.error('PricingController.getPricingRules error:', error);
      this.sendInternalError(res, error as Error);
    }
  }

  /**
   * Create Pricing Rule
   * POST /api/pricing/rules
   */
  async createPricingRule(req: Request, res: Response): Promise<void> {
    try {
      const { name, ruleType, value, priority } = req.body;

      if (!name || typeof name !== 'string') {
        this.sendValidationError(res, ['Rule name is required']);
        return;
      }

      if (!ruleType || !['fixed_discount', 'percentage_discount', 'fixed_price', 'buy_get'].includes(ruleType)) {
        this.sendValidationError(res, ['Valid rule type is required']);
        return;
      }

      if (value === undefined || typeof value !== 'number') {
        this.sendValidationError(res, ['Rule value is required']);
        return;
      }

      const createdRule = {
        ruleId: `rule-${Date.now()}`,
        ruleType,
        name,
        value,
        priority: priority || 1,
        isActive: true,
        validFrom: new Date(),
        validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
      };

      const response: ApiResponse = {
        success: true,
        data: createdRule,
        meta: {
          timestamp: new Date(),
          requestId: this.getRequestId(req)
        }
      };

      res.status(201).json(response);

    } catch (error) {
      console.error('PricingController.createPricingRule error:', error);
      this.sendInternalError(res, error as Error);
    }
  }

  /**
   * Get Pricing Analytics
   * GET /api/pricing/analytics
   */
  async getPricingAnalytics(req: Request, res: Response): Promise<void> {
    try {
      // Mock analytics data
      const analytics = {
        period: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: new Date()
        },
        summary: {
          totalProducts: 1250,
          totalPriceChanges: 89,
          averagePriceChangePercent: 5.2,
          totalRevenueImpact: 15420.50,
          mostUsedStrategy: 'percentage'
        },
        rulePerformance: [
          {
            ruleId: 'rule-1',
            ruleName: 'Loyalty Discount',
            usageCount: 45,
            averageDiscount: 10.5,
            revenueImpact: 8920.00
          }
        ],
        strategyBreakdown: {
          percentage: { usageCount: 56, averageValue: 8.5, totalImpact: 12420.75 },
          fixed: { usageCount: 23, averageValue: 15.0, totalImpact: 2999.75 },
          formula: { usageCount: 10, averageValue: 12.0, totalImpact: 0 }
        },
        temporalTrends: [
          { date: '2024-01-01', priceChanges: 5, revenueImpact: 1250.00, activeRules: 3 },
          { date: '2024-01-02', priceChanges: 8, revenueImpact: 2100.00, activeRules: 4 }
        ]
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
      console.error('PricingController.getPricingAnalytics error:', error);
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
