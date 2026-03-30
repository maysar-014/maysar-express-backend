/**
 * Pricing Mapper Test Suite
 * Tests for pricing data mapping between different layers
 */

import { PricingMapper } from '../pricing-mapper';
import {
  UpdatePricingCommandDto,
  BulkUpdatePricingCommandDto,
  PricingRuleDto,
  CalculatePriceRequestDto,
  CalculatePriceResultDto,
  UpdatePricingResultDto,
  BulkUpdatePricingResultDto,
  PricingAnalyticsDto
} from '../../dto/pricing-dto';

describe('PricingMapper', () => {
  describe('ruleDtoToDomain', () => {
    it('should map PricingRuleDto to domain rule', () => {
      const dto: PricingRuleDto = {
        ruleId: 'rule-123',
        ruleType: 'percentage_discount',
        name: 'Summer Discount',
        description: 'Summer season discount',
        value: 20,
        conditions: [
          {
            conditionId: 'cond-1',
            type: 'min_quantity',
            operator: 'greater_than',
            value: 5
          }
        ],
        priority: 10,
        isActive: true,
        validFrom: new Date('2023-06-01'),
        validTo: new Date('2023-08-31')
      };

      const domainRule = PricingMapper.ruleDtoToDomain(dto);

      expect(domainRule.ruleId).toBe('rule-123');
      expect(domainRule.ruleType).toBe('percentage_discount');
      expect(domainRule.name).toBe('Summer Discount');
      expect(domainRule.description).toBe('Summer season discount');
      expect(domainRule.value).toBe(20);
      expect(domainRule.conditions).toHaveLength(1);
      expect(domainRule.priority).toBe(10);
      expect(domainRule.isActive).toBe(true);
      expect(domainRule.validFrom).toEqual(new Date('2023-06-01'));
      expect(domainRule.validTo).toEqual(new Date('2023-08-31'));
    });

    it('should handle minimal PricingRuleDto', () => {
      const dto: PricingRuleDto = {
        ruleId: 'rule-minimal',
        ruleType: 'fixed_discount',
        name: 'Minimal Rule',
        value: 5,
        priority: 1,
        isActive: true
      };

      const domainRule = PricingMapper.ruleDtoToDomain(dto);

      expect(domainRule.ruleId).toBe('rule-minimal');
      expect(domainRule.ruleType).toBe('fixed_discount');
      expect(domainRule.name).toBe('Minimal Rule');
      expect(domainRule.value).toBe(5);
      expect(domainRule.priority).toBe(1);
      expect(domainRule.isActive).toBe(true);
      expect(domainRule.conditions).toBeUndefined();
      expect(domainRule.validFrom).toBeUndefined();
      expect(domainRule.validTo).toBeUndefined();
    });

    it('should handle empty conditions', () => {
      const dto: PricingRuleDto = {
        ruleId: 'rule-no-conditions',
        ruleType: 'fixed_price',
        name: 'No Conditions Rule',
        value: 100,
        conditions: [],
        priority: 5,
        isActive: true
      };

      const domainRule = PricingMapper.ruleDtoToDomain(dto);

      expect(domainRule.conditions).toEqual([]);
    });
  });

  describe('ruleDomainToDto', () => {
    it('should map domain rule to PricingRuleDto', () => {
      const domainRule = {
        ruleId: 'domain-rule-123',
        ruleType: 'buy_get',
        name: 'Buy One Get One',
        description: 'Buy one get one free',
        value: 1,
        conditions: [
          {
            conditionId: 'domain-cond-1',
            type: 'min_quantity',
            operator: 'equals',
            value: 2
          }
        ],
        priority: 15,
        isActive: true,
        validFrom: new Date('2023-01-01'),
        validTo: new Date('2023-12-31'),
        metadata: {
          createdBy: 'admin',
          lastModified: new Date()
        }
      };

      const dto = PricingMapper.ruleDomainToDto(domainRule);

      expect(dto.ruleId).toBe('domain-rule-123');
      expect(dto.ruleType).toBe('buy_get');
      expect(dto.name).toBe('Buy One Get One');
      expect(dto.description).toBe('Buy one get one free');
      expect(dto.value).toBe(1);
      expect(dto.conditions).toHaveLength(1);
      expect(dto.priority).toBe(15);
      expect(dto.isActive).toBe(true);
      expect(dto.validFrom).toEqual(new Date('2023-01-01'));
      expect(dto.validTo).toEqual(new Date('2023-12-31'));
      expect(dto.metadata).toEqual({
        createdBy: 'admin',
        lastModified: expect.any(Date)
      });
    });

    it('should handle domain rule without metadata', () => {
      const domainRule = {
        ruleId: 'domain-rule-minimal',
        ruleType: 'percentage_discount',
        name: 'Minimal Domain Rule',
        value: 10,
        priority: 1,
        isActive: true
      };

      const dto = PricingMapper.ruleDomainToDto(domainRule);

      expect(dto.ruleId).toBe('domain-rule-minimal');
      expect(dto.ruleType).toBe('percentage_discount');
      expect(dto.name).toBe('Minimal Domain Rule');
      expect(dto.value).toBe(10);
      expect(dto.priority).toBe(1);
      expect(dto.isActive).toBe(true);
      expect(dto.metadata).toEqual({});
    });
  });

  describe('calculatePriceRequestToDomain', () => {
    it('should map CalculatePriceRequestDto to domain format', () => {
      const dto: CalculatePriceRequestDto = {
        productId: 'product-123',
        basePrice: 100,
        pricingRules: [
          {
            ruleId: 'rule-1',
            ruleType: 'percentage_discount',
            name: 'Customer Discount',
            value: 10,
            priority: 1,
            isActive: true
          }
        ],
        customerContext: {
          customerId: 'customer-123',
          segment: 'premium',
          loyaltyTier: 'gold',
          location: {
            country: 'US',
            region: 'CA',
            city: 'San Francisco'
          },
          purchaseHistory: {
            totalOrders: 15,
            totalSpent: 2500,
            lastOrderDate: new Date('2023-05-15'),
            isFirstTime: false
          }
        },
        context: {
          quantity: 2,
          couponCode: 'SUMMER20',
          campaignId: 'summer-sale'
        }
      };

      const domainRequest = PricingMapper.calculatePriceRequestToDomain(dto);

      expect(domainRequest.productId).toBe('product-123');
      expect(domainRequest.basePrice).toBe(100);
      expect(domainRequest.pricingRules).toHaveLength(1);
      expect(domainRequest.customerContext).toBeDefined();
      expect(domainRequest.customerContext?.customerId).toBe('customer-123');
      expect(domainRequest.customerContext?.segment).toBe('premium');
      expect(domainRequest.customerContext?.loyaltyTier).toBe('gold');
      expect(domainRequest.context).toBeDefined();
      expect(domainRequest.context?.quantity).toBe(2);
      expect(domainRequest.context?.couponCode).toBe('SUMMER20');
      expect(domainRequest.context?.campaignId).toBe('summer-sale');
    });

    it('should handle minimal CalculatePriceRequestDto', () => {
      const dto: CalculatePriceRequestDto = {
        productId: 'product-minimal',
        basePrice: 50,
        pricingRules: []
      };

      const domainRequest = PricingMapper.calculatePriceRequestToDomain(dto);

      expect(domainRequest.productId).toBe('product-minimal');
      expect(domainRequest.basePrice).toBe(50);
      expect(domainRequest.pricingRules).toEqual([]);
      expect(domainRequest.customerContext).toBeUndefined();
      expect(domainRequest.context).toBeUndefined();
    });
  });

  describe('calculatePriceResultToDto', () => {
    it('should map domain calculation result to CalculatePriceResultDto', () => {
      const domainResult = {
        productId: 'product-result-123',
        basePrice: 100,
        finalPrice: 85,
        currency: 'USD',
        appliedRules: [
          {
            ruleId: 'rule-1',
            ruleName: 'Customer Discount',
            discountAmount: 15,
            discountPercent: 15,
            priority: 1
          }
        ],
        totalDiscount: 15,
        totalDiscountPercent: 15,
        breakdown: {
          originalPrice: 100,
          discounts: [
            {
              type: 'percentage',
              amount: 15,
              description: 'Customer discount'
            }
          ],
          taxes: [
            {
              type: 'sales_tax',
              amount: 7.65,
              rate: 0.0765
            }
          ],
          fees: [
            {
              type: 'processing_fee',
              amount: 2.5,
              description: 'Payment processing fee'
            }
          ]
        },
        metadata: {
          calculationId: 'calc-123',
          calculatedAt: new Date('2023-06-15T10:30:00Z'),
          calculationTime: 45,
          rulesApplied: 1
        }
      };

      const dto = PricingMapper.calculatePriceResultToDto(domainResult);

      expect(dto.productId).toBe('product-result-123');
      expect(dto.basePrice).toBe(100);
      expect(dto.finalPrice).toBe(85);
      expect(dto.currency).toBe('USD');
      expect(dto.appliedRules).toHaveLength(1);
      expect(dto.appliedRules[0].ruleId).toBe('rule-1');
      expect(dto.appliedRules[0].ruleName).toBe('Customer Discount');
      expect(dto.appliedRules[0].discountAmount).toBe(15);
      expect(dto.appliedRules[0].discountPercent).toBe(15);
      expect(dto.totalDiscount).toBe(15);
      expect(dto.totalDiscountPercent).toBe(15);
      expect(dto.breakdown.originalPrice).toBe(100);
      expect(dto.breakdown.discounts).toHaveLength(1);
      expect(dto.breakdown.taxes).toHaveLength(1);
      expect(dto.breakdown.fees).toHaveLength(1);
      expect(dto.metadata.calculationId).toBe('calc-123');
      expect(dto.metadata.calculatedAt).toEqual(new Date('2023-06-15T10:30:00Z'));
      expect(dto.metadata.calculationTime).toBe(45);
      expect(dto.metadata.rulesApplied).toBe(1);
    });

    it('should handle result without optional fields', () => {
      const domainResult = {
        productId: 'product-simple',
        basePrice: 50,
        finalPrice: 50,
        currency: 'USD',
        appliedRules: [],
        totalDiscount: 0,
        totalDiscountPercent: 0,
        breakdown: {
          originalPrice: 50,
          discounts: []
        },
        metadata: {
          calculationId: 'calc-simple',
          calculatedAt: new Date(),
          calculationTime: 10,
          rulesApplied: 0
        }
      };

      const dto = PricingMapper.calculatePriceResultToDto(domainResult);

      expect(dto.productId).toBe('product-simple');
      expect(dto.basePrice).toBe(50);
      expect(dto.finalPrice).toBe(50);
      expect(dto.currency).toBe('USD');
      expect(dto.appliedRules).toEqual([]);
      expect(dto.totalDiscount).toBe(0);
      expect(dto.totalDiscountPercent).toBe(0);
      expect(dto.breakdown.originalPrice).toBe(50);
      expect(dto.breakdown.discounts).toEqual([]);
      expect(dto.breakdown.taxes).toBeUndefined();
      expect(dto.breakdown.fees).toBeUndefined();
    });
  });

  describe('updatePricingResultToDto', () => {
    it('should map domain update result to UpdatePricingResultDto', () => {
      const domainResult = {
        productId: 'product-update-123',
        success: true,
        previousPrice: {
          amount: 100,
          currency: 'USD'
        },
        newPrice: {
          amount: 120,
          currency: 'USD'
        },
        changeAmount: 20,
        changePercent: 20,
        pricingStrategy: 'percentage',
        effectiveDate: new Date('2023-07-01'),
        expiryDate: new Date('2023-12-31'),
        updatedAt: new Date('2023-06-15T14:30:00Z'),
        updatedBy: 'admin-user',
        reason: 'Seasonal price adjustment',
        validationResults: {
          businessRulesPassed: true,
          warnings: ['Price increase exceeds 10% threshold'],
          errors: []
        }
      };

      const dto = PricingMapper.updatePricingResultToDto(domainResult);

      expect(dto.productId).toBe('product-update-123');
      expect(dto.success).toBe(true);
      expect(dto.previousPrice).toEqual({
        amount: 100,
        currency: 'USD'
      });
      expect(dto.newPrice).toEqual({
        amount: 120,
        currency: 'USD'
      });
      expect(dto.changeAmount).toBe(20);
      expect(dto.changePercent).toBe(20);
      expect(dto.pricingStrategy).toBe('percentage');
      expect(dto.effectiveDate).toEqual(new Date('2023-07-01'));
      expect(dto.expiryDate).toEqual(new Date('2023-12-31'));
      expect(dto.updatedAt).toEqual(new Date('2023-06-15T14:30:00Z'));
      expect(dto.updatedBy).toBe('admin-user');
      expect(dto.reason).toBe('Seasonal price adjustment');
      expect(dto.validationResults?.businessRulesPassed).toBe(true);
      expect(dto.validationResults?.warnings).toContain('Price increase exceeds 10% threshold');
      expect(dto.validationResults?.errors).toEqual([]);
    });

    it('should handle failed update result', () => {
      const domainResult = {
        productId: 'product-failed',
        success: false,
        previousPrice: {
          amount: 50,
          currency: 'USD'
        },
        newPrice: {
          amount: 50,
          currency: 'USD'
        },
        changeAmount: 0,
        changePercent: 0,
        pricingStrategy: 'fixed',
        updatedAt: new Date(),
        updatedBy: 'system',
        validationResults: {
          businessRulesPassed: false,
          warnings: [],
          errors: ['Price cannot be negative']
        }
      };

      const dto = PricingMapper.updatePricingResultToDto(domainResult);

      expect(dto.productId).toBe('product-failed');
      expect(dto.success).toBe(false);
      expect(dto.changeAmount).toBe(0);
      expect(dto.changePercent).toBe(0);
      expect(dto.validationResults?.businessRulesPassed).toBe(false);
      expect(dto.validationResults?.errors).toContain('Price cannot be negative');
    });
  });

  describe('bulkUpdatePricingResultToDto', () => {
    it('should map domain bulk update result to BulkUpdatePricingResultDto', () => {
      const domainResult = {
        operationId: 'bulk-op-123',
        totalProducts: 100,
        successfulUpdates: 95,
        failedUpdates: 3,
        skippedProducts: 2,
        pricingStrategy: 'percentage',
        pricingValue: 10,
        results: [
          {
            productId: 'product-1',
            success: true,
            previousPrice: { amount: 100, currency: 'USD' },
            newPrice: { amount: 110, currency: 'USD' },
            changeAmount: 10,
            changePercent: 10,
            pricingStrategy: 'percentage',
            updatedAt: new Date(),
            updatedBy: 'admin',
            validationResults: { businessRulesPassed: true, warnings: [], errors: [] }
          }
        ],
        errors: [
          {
            productId: 'product-error',
            error: 'Product not found',
            errorCode: 'NOT_FOUND'
          }
        ],
        warnings: [
          {
            productId: 'product-warning',
            warning: 'Price change exceeds threshold',
            warningCode: 'THRESHOLD_EXCEEDED'
          }
        ],
        pricingImpact: {
          totalRevenueChange: 5000,
          averagePriceChangePercent: 8.5,
          productsAffected: 95
        },
        metadata: {
          operationId: 'bulk-op-123',
          startedAt: new Date('2023-06-15T10:00:00Z'),
          completedAt: new Date('2023-06-15T10:05:00Z'),
          executionTime: 300000,
          requestId: 'req-123',
          requestedBy: 'admin-user'
        }
      };

      const dto = PricingMapper.bulkUpdatePricingResultToDto(domainResult);

      expect(dto.operationId).toBe('bulk-op-123');
      expect(dto.totalProducts).toBe(100);
      expect(dto.successfulUpdates).toBe(95);
      expect(dto.failedUpdates).toBe(3);
      expect(dto.skippedProducts).toBe(2);
      expect(dto.pricingStrategy).toBe('percentage');
      expect(dto.pricingValue).toBe(10);
      expect(dto.results).toHaveLength(1);
      expect(dto.errors).toHaveLength(1);
      expect(dto.warnings).toHaveLength(1);
      expect(dto.pricingImpact.totalRevenueChange).toBe(5000);
      expect(dto.pricingImpact.averagePriceChangePercent).toBe(8.5);
      expect(dto.pricingImpact.productsAffected).toBe(95);
      expect(dto.metadata.operationId).toBe('bulk-op-123');
      expect(dto.metadata.requestId).toBe('req-123');
      expect(dto.metadata.requestedBy).toBe('admin-user');
    });
  });

  describe('pricingAnalyticsToDto', () => {
    it('should map domain analytics to PricingAnalyticsDto', () => {
      const domainAnalytics = {
        period: {
          start: new Date('2023-06-01'),
          end: new Date('2023-06-30')
        },
        summary: {
          totalProducts: 1000,
          totalPriceChanges: 150,
          averagePriceChangePercent: 5.2,
          totalRevenueImpact: 25000,
          mostUsedStrategy: 'percentage'
        },
        rulePerformance: [
          {
            ruleId: 'rule-1',
            ruleName: 'Customer Discount',
            usageCount: 500,
            averageDiscount: 15,
            revenueImpact: 12000
          }
        ],
        strategyBreakdown: {
          percentage: {
            usageCount: 800,
            averageValue: 8.5,
            totalImpact: 20000
          },
          fixed: {
            usageCount: 200,
            averageValue: 5,
            totalImpact: 5000
          }
        },
        temporalTrends: [
          {
            date: '2023-06-01',
            priceChanges: 10,
            revenueImpact: 1500,
            activeRules: 5
          }
        ]
      };

      const dto = PricingMapper.pricingAnalyticsToDto(domainAnalytics);

      expect(dto.period.start).toEqual(new Date('2023-06-01'));
      expect(dto.period.end).toEqual(new Date('2023-06-30'));
      expect(dto.summary.totalProducts).toBe(1000);
      expect(dto.summary.totalPriceChanges).toBe(150);
      expect(dto.summary.averagePriceChangePercent).toBe(5.2);
      expect(dto.summary.totalRevenueImpact).toBe(25000);
      expect(dto.summary.mostUsedStrategy).toBe('percentage');
      expect(dto.rulePerformance).toHaveLength(1);
      expect(dto.rulePerformance[0].ruleId).toBe('rule-1');
      expect(dto.rulePerformance[0].usageCount).toBe(500);
      expect(dto.strategyBreakdown.percentage.usageCount).toBe(800);
      expect(dto.strategyBreakdown.fixed.usageCount).toBe(200);
      expect(dto.temporalTrends).toHaveLength(1);
      expect(dto.temporalTrends[0].date).toBe('2023-06-01');
    });
  });

  describe('batch mapping', () => {
    it('should map multiple pricing rules to DTOs', () => {
      const domainRules = [
        {
          ruleId: 'rule-1',
          ruleType: 'percentage_discount',
          name: 'Rule 1',
          value: 10,
          priority: 1,
          isActive: true
        },
        {
          ruleId: 'rule-2',
          ruleType: 'fixed_discount',
          name: 'Rule 2',
          value: 5,
          priority: 2,
          isActive: true
        }
      ];

      const dtos = PricingMapper.rulesToDtoBatch(domainRules);

      expect(dtos).toHaveLength(2);
      expect(dtos[0].ruleId).toBe('rule-1');
      expect(dtos[0].ruleType).toBe('percentage_discount');
      expect(dtos[1].ruleId).toBe('rule-2');
      expect(dtos[1].ruleType).toBe('fixed_discount');
    });

    it('should map multiple pricing results to DTOs', () => {
      const domainResults = [
        {
          productId: 'product-1',
          basePrice: 100,
          finalPrice: 90,
          currency: 'USD',
          appliedRules: [],
          totalDiscount: 10,
          totalDiscountPercent: 10,
          breakdown: { originalPrice: 100, discounts: [] },
          metadata: { calculationId: 'calc-1', calculatedAt: new Date(), calculationTime: 10, rulesApplied: 0 }
        },
        {
          productId: 'product-2',
          basePrice: 200,
          finalPrice: 180,
          currency: 'USD',
          appliedRules: [],
          totalDiscount: 20,
          totalDiscountPercent: 10,
          breakdown: { originalPrice: 200, discounts: [] },
          metadata: { calculationId: 'calc-2', calculatedAt: new Date(), calculationTime: 15, rulesApplied: 0 }
        }
      ];

      const dtos = PricingMapper.pricingResultsToDtoBatch(domainResults);

      expect(dtos).toHaveLength(2);
      expect(dtos[0].productId).toBe('product-1');
      expect(dtos[0].finalPrice).toBe(90);
      expect(dtos[1].productId).toBe('product-2');
      expect(dtos[1].finalPrice).toBe(180);
    });
  });

  describe('validation', () => {
    it('should validate UpdatePricingCommandDto', () => {
      const validDto: UpdatePricingCommandDto = {
        productId: 'product-123',
        pricingStrategy: 'percentage',
        pricingValue: 10,
        requestedBy: 'admin'
      };

      const invalidDto: any = {
        productId: '',
        pricingStrategy: 'invalid',
        pricingValue: -5,
        requestedBy: ''
      };

      expect(PricingMapper.validateUpdatePricingCommand(validDto)).toBe(true);
      expect(PricingMapper.validateUpdatePricingCommand(invalidDto)).toBe(false);
    });

    it('should validate BulkUpdatePricingCommandDto', () => {
      const validDto: BulkUpdatePricingCommandDto = {
        productIds: ['product-1', 'product-2'],
        pricingStrategy: 'percentage',
        pricingValue: 10,
        reason: 'Seasonal adjustment',
        requestId: 'req-123',
        requestedBy: 'admin'
      };

      const invalidDto: any = {
        productIds: [],
        pricingStrategy: 'invalid',
        pricingValue: 2000,
        reason: '',
        requestId: '',
        requestedBy: ''
      };

      expect(PricingMapper.validateBulkUpdatePricingCommand(validDto)).toBe(true);
      expect(PricingMapper.validateBulkUpdatePricingCommand(invalidDto)).toBe(false);
    });

    it('should validate PricingRuleDto', () => {
      const validDto: PricingRuleDto = {
        ruleId: 'rule-123',
        ruleType: 'percentage_discount',
        name: 'Valid Rule',
        value: 10,
        priority: 5,
        isActive: true
      };

      const invalidDto: any = {
        ruleId: '',
        ruleType: 'invalid',
        name: '',
        value: 'invalid',
        priority: -1,
        isActive: 'not boolean'
      };

      expect(PricingMapper.validatePricingRule(validDto)).toBe(true);
      expect(PricingMapper.validatePricingRule(invalidDto)).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle null DTO gracefully', () => {
      expect(() => {
        PricingMapper.ruleDtoToDomain(null as unknown as PricingRuleDto);
      }).toThrow();

      expect(() => {
        PricingMapper.ruleDomainToDto(null as unknown as PricingRuleDto);
      }).toThrow();

      expect(() => {
        PricingMapper.calculatePriceRequestToDomain(null as unknown as CalculatePriceRequestDto);
      }).toThrow();

      expect(() => {
        PricingMapper.calculatePriceResultToDto(null as unknown as CalculatePriceResultDto);
      }).toThrow();
    });

    it('should handle undefined DTO gracefully', () => {
      expect(() => {
        PricingMapper.ruleDtoToDomain(undefined as unknown as PricingRuleDto);
      }).toThrow();

      expect(() => {
        PricingMapper.ruleDomainToDto(undefined as unknown as PricingRuleDto);
      }).toThrow();
    });

    it('should handle invalid domain objects', () => {
      const invalidDomain = {
        // Missing required fields
      } as unknown as PricingRuleDto;

      expect(() => {
        PricingMapper.ruleDomainToDto(invalidDomain);
      }).toThrow();
    });
  });

  describe('data integrity', () => {
    it('should preserve data integrity in rule mapping', () => {
      const originalDto: PricingRuleDto = {
        ruleId: 'integrity-rule',
        ruleType: 'fixed_discount',
        name: 'Integrity Test Rule',
        description: 'Testing data integrity',
        value: 25,
        conditions: [
          {
            conditionId: 'integrity-cond',
            type: 'min_quantity',
            operator: 'greater_than',
            value: 10
          }
        ],
        priority: 100,
        isActive: true,
        validFrom: new Date('2023-01-01'),
        validTo: new Date('2023-12-31')
      };

      const domainRule = PricingMapper.ruleDtoToDomain(originalDto);
      const roundtripDto = PricingMapper.ruleDomainToDto(domainRule);

      expect(roundtripDto.ruleId).toBe(originalDto.ruleId);
      expect(roundtripDto.ruleType).toBe(originalDto.ruleType);
      expect(roundtripDto.name).toBe(originalDto.name);
      expect(roundtripDto.description).toBe(originalDto.description);
      expect(roundtripDto.value).toBe(originalDto.value);
      expect(roundtripDto.conditions).toEqual(originalDto.conditions);
      expect(roundtripDto.priority).toBe(originalDto.priority);
      expect(roundtripDto.isActive).toBe(originalDto.isActive);
      expect(roundtripDto.validFrom).toEqual(originalDto.validFrom);
      expect(roundtripDto.validTo).toEqual(originalDto.validTo);
    });

    it('should preserve data integrity in calculation result mapping', () => {
      const originalResult = {
        productId: 'integrity-product',
        basePrice: 100,
        finalPrice: 85,
        currency: 'USD',
        appliedRules: [
          {
            ruleId: 'integrity-rule',
            ruleName: 'Integrity Rule',
            discountAmount: 15,
            discountPercent: 15,
            priority: 1
          }
        ],
        totalDiscount: 15,
        totalDiscountPercent: 15,
        breakdown: {
          originalPrice: 100,
          discounts: [
            {
              type: 'percentage',
              amount: 15,
              description: 'Integrity discount'
            }
          ]
        },
        metadata: {
          calculationId: 'integrity-calc',
          calculatedAt: new Date('2023-06-15T10:30:00Z'),
          calculationTime: 45,
          rulesApplied: 1
        }
      };

      const dto = PricingMapper.calculatePriceResultToDto(originalResult);
      // Note: We can't do a full roundtrip test here since the domain format is different
      // But we can verify the DTO contains all expected data

      expect(dto.productId).toBe('integrity-product');
      expect(dto.basePrice).toBe(100);
      expect(dto.finalPrice).toBe(85);
      expect(dto.currency).toBe('USD');
      expect(dto.appliedRules).toHaveLength(1);
      expect(dto.appliedRules[0].ruleId).toBe('integrity-rule');
      expect(dto.appliedRules[0].discountAmount).toBe(15);
      expect(dto.totalDiscount).toBe(15);
      expect(dto.breakdown.originalPrice).toBe(100);
      expect(dto.breakdown.discounts).toHaveLength(1);
      expect(dto.metadata.calculationId).toBe('integrity-calc');
    });
  });
});
