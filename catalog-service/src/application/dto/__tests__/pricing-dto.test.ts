/**
 * Pricing DTO Tests
 * 
 * Purpose: Validates pricing DTO validation logic and type guards
 * Scope: Application layer DTO testing with business rule validation
 * Coverage Target: 85% (DTO validation and type safety)
 * 
 * Test Categories:
 * - DTO validation logic and type guards
 * - Business rule validation for pricing
 * - Error handling for invalid pricing data
 * - Factory function validation
 */

import {
  UpdatePricingCommandDto,
  BulkUpdatePricingCommandDto,
  PricingRuleDto,
  CalculatePriceRequestDto,
  CalculatePriceResultDto,
  PricingStrategy,
  PricingRuleType,
  isUpdatePricingCommandDto,
  isBulkUpdatePricingCommandDto,
  isPricingRuleDto,
  createUpdatePricingCommand,
  createBulkUpdatePricingCommand,
  createPricingRule
} from '../pricing-dto';

describe('Pricing DTOs', () => {
  describe('UpdatePricingCommandDto', () => {
    describe('when validating pricing commands', () => {
      it('should accept valid pricing command', () => {
        // Given: Valid pricing command DTO
        const dto: UpdatePricingCommandDto = {
          productId: 'product-123',
          pricingStrategy: 'fixed',
          pricingValue: 99.99,
          currency: 'USD',
          effectiveDate: new Date('2024-02-01'),
          expiryDate: new Date('2024-12-31'),
          reason: 'Price adjustment for market conditions',
          requestedBy: 'admin-456',
          metadata: { source: 'admin_panel', campaign: 'winter_sale' }
        };

        // When: Validating DTO structure
        // Then: Should have all required properties
        expect(dto.productId).toBe('product-123');
        expect(dto.pricingStrategy).toBe('fixed');
        expect(dto.pricingValue).toBe(99.99);
        expect(dto.currency).toBe('USD');
        expect(dto.effectiveDate).toBeInstanceOf(Date);
        expect(dto.expiryDate).toBeInstanceOf(Date);
        expect(dto.reason).toBe('Price adjustment for market conditions');
        expect(dto.requestedBy).toBe('admin-456');
        expect(dto.metadata).toEqual({ source: 'admin_panel', campaign: 'winter_sale' });
      });

      it('should handle minimal required data', () => {
        // Given: Minimal pricing command DTO
        const dto: UpdatePricingCommandDto = {
          productId: 'product-123',
          pricingStrategy: 'percentage',
          pricingValue: 10,
          requestedBy: 'admin-456'
        };

        // When: Validating minimal DTO
        // Then: Should have required fields only
        expect(dto.productId).toBe('product-123');
        expect(dto.pricingStrategy).toBe('percentage');
        expect(dto.pricingValue).toBe(10);
        expect(dto.requestedBy).toBe('admin-456');
        expect(dto.currency).toBeUndefined();
        expect(dto.effectiveDate).toBeUndefined();
        expect(dto.expiryDate).toBeUndefined();
        expect(dto.reason).toBeUndefined();
        expect(dto.metadata).toBeUndefined();
      });
    });

    describe('when validating pricing strategies', () => {
      it('should accept valid pricing strategies', () => {
        // Given: Valid pricing strategies
        const strategies: PricingStrategy[] = ['fixed', 'percentage', 'formula'];

        // When: Validating strategies
        // Then: Should accept all valid strategies
        strategies.forEach(strategy => {
          const dto: UpdatePricingCommandDto = {
            productId: 'product-123',
            pricingStrategy: strategy,
            pricingValue: strategy === 'percentage' ? 15 : 99.99,
            requestedBy: 'admin-456'
          };

          expect(['fixed', 'percentage', 'formula']).toContain(dto.pricingStrategy);
        });
      });
    });
  });

  describe('BulkUpdatePricingCommandDto', () => {
    describe('when validating bulk operations', () => {
      it('should accept valid bulk pricing command', () => {
        // Given: Valid bulk pricing command DTO
        const dto: BulkUpdatePricingCommandDto = {
          productIds: ['product-1', 'product-2', 'product-3'],
          pricingStrategy: 'percentage',
          pricingValue: 20,
          currency: 'USD',
          effectiveDate: new Date('2024-03-01'),
          expiryDate: new Date('2024-06-30'),
          sellerId: 'seller-789',
          reason: 'Seasonal discount campaign',
          validateBusinessRules: true,
          notifyStakeholders: true,
          requestId: 'bulk-req-123',
          requestedBy: 'admin-456'
        };

        // When: Validating bulk DTO structure
        // Then: Should have all properties
        expect(dto.productIds).toEqual(['product-1', 'product-2', 'product-3']);
        expect(dto.pricingStrategy).toBe('percentage');
        expect(dto.pricingValue).toBe(20);
        expect(dto.currency).toBe('USD');
        expect(dto.effectiveDate).toBeInstanceOf(Date);
        expect(dto.expiryDate).toBeInstanceOf(Date);
        expect(dto.sellerId).toBe('seller-789');
        expect(dto.reason).toBe('Seasonal discount campaign');
        expect(dto.validateBusinessRules).toBe(true);
        expect(dto.notifyStakeholders).toBe(true);
        expect(dto.requestId).toBe('bulk-req-123');
        expect(dto.requestedBy).toBe('admin-456');
      });

      it('should handle large product lists', () => {
        // Given: Bulk command with many products
        const manyProductIds = Array.from({ length: 100 }, (_, i) => `product-${i + 1}`);
        const dto: BulkUpdatePricingCommandDto = {
          productIds: manyProductIds,
          pricingStrategy: 'fixed',
          pricingValue: 49.99,
          reason: 'Bulk price update',
          requestId: 'bulk-large-123',
          requestedBy: 'admin-456'
        };

        // When: Validating large bulk operation
        // Then: Should handle many products
        expect(dto.productIds).toHaveLength(100);
        expect(dto.productIds[0]).toBe('product-1');
        expect(dto.productIds[99]).toBe('product-100');
        expect(dto.productIds.every(id => typeof id === 'string')).toBe(true);
      });
    });
  });

  describe('PricingRuleDto', () => {
    describe('when validating pricing rules', () => {
      it('should accept valid pricing rule', () => {
        // Given: Valid pricing rule DTO
        const dto: PricingRuleDto = {
          ruleId: 'rule-123',
          ruleType: 'percentage_discount',
          name: 'Volume Discount',
          description: 'Discount for bulk purchases',
          value: 15,
          conditions: [
            {
              conditionId: 'cond-1',
              type: 'min_quantity',
              operator: 'greater_than',
              value: 10
            }
          ],
          priority: 5,
          isActive: true,
          validFrom: new Date('2024-01-01'),
          validTo: new Date('2024-12-31'),
          metadata: { category: 'volume_discount' }
        };

        // When: Validating rule structure
        // Then: Should have all properties
        expect(dto.ruleId).toBe('rule-123');
        expect(dto.ruleType).toBe('percentage_discount');
        expect(dto.name).toBe('Volume Discount');
        expect(dto.description).toBe('Discount for bulk purchases');
        expect(dto.value).toBe(15);
        expect(dto.conditions).toHaveLength(1);
        expect(dto.priority).toBe(5);
        expect(dto.isActive).toBe(true);
        expect(dto.validFrom).toBeInstanceOf(Date);
        expect(dto.validTo).toBeInstanceOf(Date);
        expect(dto.metadata).toEqual({ category: 'volume_discount' });
      });

      it('should handle different rule types', () => {
        // Given: Different pricing rule types
        const ruleTypes: PricingRuleType[] = [
          'fixed_discount',
          'percentage_discount',
          'fixed_price',
          'buy_get'
        ];

        // When: Validating rule types
        // Then: Should accept all valid types
        ruleTypes.forEach(ruleType => {
          const dto: PricingRuleDto = {
            ruleId: `rule-${ruleType}`,
            ruleType,
            name: `Test ${ruleType} Rule`,
            value: ruleType === 'percentage_discount' ? 10 : 50,
            priority: 1,
            isActive: true
          };

          expect(['fixed_discount', 'percentage_discount', 'fixed_price', 'buy_get']).toContain(dto.ruleType);
        });
      });
    });
  });

  describe('CalculatePriceRequestDto', () => {
    describe('when validating price calculation requests', () => {
      it('should accept complete calculation request', () => {
        // Given: Complete price calculation request
        const dto: CalculatePriceRequestDto = {
          productId: 'product-123',
          basePrice: 100.00,
          pricingRules: [
            {
              ruleId: 'rule-1',
              ruleType: 'percentage_discount',
              name: 'Loyalty Discount',
              value: 10,
              priority: 1,
              isActive: true
            }
          ],
          customerContext: {
            customerId: 'customer-456',
            segment: 'premium',
            loyaltyTier: 'gold',
            location: {
              country: 'US',
              region: 'CA',
              city: 'San Francisco'
            },
            purchaseHistory: {
              totalOrders: 25,
              totalSpent: 2500.00,
              lastOrderDate: new Date('2024-01-15'),
              isFirstTime: false
            }
          },
          context: {
            quantity: 2,
            couponCode: 'SAVE10',
            referralCode: 'REF123',
            campaignId: 'campaign-789'
          }
        };

        // When: Validating calculation request
        // Then: Should have all context data
        expect(dto.productId).toBe('product-123');
        expect(dto.basePrice).toBe(100.00);
        expect(dto.pricingRules).toHaveLength(1);
        expect(dto.customerContext?.customerId).toBe('customer-456');
        expect(dto.customerContext?.segment).toBe('premium');
        expect(dto.customerContext?.loyaltyTier).toBe('gold');
        expect(dto.customerContext?.location?.country).toBe('US');
        expect(dto.customerContext?.purchaseHistory?.totalOrders).toBe(25);
        expect(dto.context?.quantity).toBe(2);
        expect(dto.context?.couponCode).toBe('SAVE10');
      });

      it('should handle minimal calculation request', () => {
        // Given: Minimal calculation request
        const dto: CalculatePriceRequestDto = {
          productId: 'product-123',
          basePrice: 50.00,
          pricingRules: []
        };

        // When: Validating minimal request
        // Then: Should have required fields only
        expect(dto.productId).toBe('product-123');
        expect(dto.basePrice).toBe(50.00);
        expect(dto.pricingRules).toEqual([]);
        expect(dto.customerContext).toBeUndefined();
        expect(dto.context).toBeUndefined();
      });
    });
  });

  describe('CalculatePriceResultDto', () => {
    describe('when validating price calculation results', () => {
      it('should have complete result structure', () => {
        // Given: Complete price calculation result
        const dto: CalculatePriceResultDto = {
          productId: 'product-123',
          basePrice: 100.00,
          finalPrice: 85.00,
          currency: 'USD',
          appliedRules: [
            {
              ruleId: 'rule-1',
              ruleName: 'Loyalty Discount',
              discountAmount: 10.00,
              discountPercent: 10,
              priority: 1
            },
            {
              ruleId: 'rule-2',
              ruleName: 'Volume Discount',
              discountAmount: 5.00,
              discountPercent: 5,
              priority: 2
            }
          ],
          totalDiscount: 15.00,
          totalDiscountPercent: 15,
          breakdown: {
            originalPrice: 100.00,
            discounts: [
              {
                type: 'loyalty',
                amount: 10.00,
                description: 'Loyalty member discount'
              },
              {
                type: 'volume',
                amount: 5.00,
                description: 'Volume purchase discount'
              }
            ],
            taxes: [
              {
                type: 'sales_tax',
                amount: 6.80,
                rate: 0.08
              }
            ],
            fees: [
              {
                type: 'processing',
                amount: 2.50,
                description: 'Payment processing fee'
              }
            ]
          },
          metadata: {
            calculationId: 'calc-789',
            calculatedAt: new Date('2024-01-20T10:30:00Z'),
            calculationTime: 45,
            rulesApplied: 2
          }
        };

        // When: Validating result structure
        // Then: Should have complete breakdown
        expect(dto.productId).toBe('product-123');
        expect(dto.basePrice).toBe(100.00);
        expect(dto.finalPrice).toBe(85.00);
        expect(dto.currency).toBe('USD');
        expect(dto.appliedRules).toHaveLength(2);
        expect(dto.totalDiscount).toBe(15.00);
        expect(dto.totalDiscountPercent).toBe(15);
        expect(dto.breakdown.originalPrice).toBe(100.00);
        expect(dto.breakdown.discounts).toHaveLength(2);
        expect(dto.breakdown.taxes).toHaveLength(1);
        expect(dto.breakdown.fees).toHaveLength(1);
        expect(dto.metadata.calculationId).toBe('calc-789');
        expect(dto.metadata.calculatedAt).toBeInstanceOf(Date);
        expect(dto.metadata.calculationTime).toBe(45);
        expect(dto.metadata.rulesApplied).toBe(2);
      });
    });
  });

  describe('Type Guards', () => {
    describe('isUpdatePricingCommandDto', () => {
      it('should validate correct pricing command', () => {
        // Given: Valid pricing command
        const validDto = {
          productId: 'product-123',
          pricingStrategy: 'fixed',
          pricingValue: 99.99,
          requestedBy: 'admin-456'
        };

        // When: Validating with type guard
        const isValid = isUpdatePricingCommandDto(validDto);

        // Then: Should return true
        expect(isValid).toBe(true);
      });

      it('should reject invalid pricing command', () => {
        // Given: Invalid pricing commands
        const invalidDtos = [
          { productId: '', pricingStrategy: 'fixed', pricingValue: 99.99, requestedBy: 'admin' },
          { productId: 'product-123', pricingStrategy: 'invalid', pricingValue: 99.99, requestedBy: 'admin' },
          { productId: 'product-123', pricingStrategy: 'fixed', pricingValue: -10, requestedBy: 'admin' },
          { productId: 'product-123', pricingStrategy: 'fixed', pricingValue: 99.99, requestedBy: '' }
        ];

        // When: Validating invalid DTOs
        // Then: Should return false for all
        invalidDtos.forEach(dto => {
          expect(isUpdatePricingCommandDto(dto)).toBe(false);
        });
      });
    });

    describe('isBulkUpdatePricingCommandDto', () => {
      it('should validate correct bulk command', () => {
        // Given: Valid bulk command
        const validDto = {
          productIds: ['product-1', 'product-2'],
          pricingStrategy: 'percentage',
          pricingValue: 10,
          reason: 'Bulk discount',
          requestId: 'bulk-123',
          requestedBy: 'admin-456'
        };

        // When: Validating with type guard
        const isValid = isBulkUpdatePricingCommandDto(validDto);

        // Then: Should return true
        expect(isValid).toBe(true);
      });

      it('should reject invalid bulk command', () => {
        // Given: Invalid bulk commands
        const invalidDtos = [
          { productIds: [], pricingStrategy: 'fixed', pricingValue: 99.99, reason: 'test', requestId: 'req', requestedBy: 'admin' },
          { productIds: ['product-1'], pricingStrategy: 'invalid', pricingValue: 99.99, reason: 'test', requestId: 'req', requestedBy: 'admin' },
          { productIds: ['product-1'], pricingStrategy: 'fixed', pricingValue: 1001, reason: 'test', requestId: 'req', requestedBy: 'admin' }
        ];

        // When: Validating invalid DTOs
        // Then: Should return false for all
        invalidDtos.forEach(dto => {
          expect(isBulkUpdatePricingCommandDto(dto)).toBe(false);
        });
      });
    });

    describe('isPricingRuleDto', () => {
      it('should validate correct pricing rule', () => {
        // Given: Valid pricing rule
        const validDto = {
          ruleId: 'rule-123',
          ruleType: 'percentage_discount',
          name: 'Test Rule',
          value: 10,
          priority: 5,
          isActive: true
        };

        // When: Validating with type guard
        const isValid = isPricingRuleDto(validDto);

        // Then: Should return true
        expect(isValid).toBe(true);
      });

      it('should reject invalid pricing rule', () => {
        // Given: Invalid pricing rules
        const invalidDtos = [
          { ruleId: '', ruleType: 'percentage_discount', name: 'Test', value: 10, priority: 5, isActive: true },
          { ruleId: 'rule-123', ruleType: 'invalid', name: 'Test', value: 10, priority: 5, isActive: true },
          { ruleId: 'rule-123', ruleType: 'percentage_discount', name: '', value: 10, priority: 5, isActive: true },
          { ruleId: 'rule-123', ruleType: 'percentage_discount', name: 'Test', value: 10, priority: 101, isActive: true }
        ];

        // When: Validating invalid DTOs
        // Then: Should return false for all
        invalidDtos.forEach(dto => {
          expect(isPricingRuleDto(dto)).toBe(false);
        });
      });
    });
  });

  describe('Factory Functions', () => {
    describe('createUpdatePricingCommand', () => {
      it('should create valid pricing command', () => {
        // Given: Valid pricing command data
        const data = {
          productId: 'product-123',
          pricingStrategy: 'fixed' as PricingStrategy,
          pricingValue: 99.99,
          requestedBy: 'admin-456'
        };

        // When: Creating pricing command
        const command = createUpdatePricingCommand(data);

        // Then: Should return valid command with metadata
        expect(command.productId).toBe('product-123');
        expect(command.pricingStrategy).toBe('fixed');
        expect(command.pricingValue).toBe(99.99);
        expect(command.requestedBy).toBe('admin-456');
        expect(command.metadata).toEqual({});
      });

      it('should throw error for invalid data', () => {
        // Given: Invalid pricing command data
        const invalidData = {
          productId: '',
          pricingStrategy: 'fixed' as PricingStrategy,
          pricingValue: 99.99,
          requestedBy: 'admin-456'
        };

        // When: Creating pricing command with invalid data
        // Then: Should throw error
        expect(() => createUpdatePricingCommand(invalidData)).toThrow('Invalid UpdatePricingCommandDto data');
      });
    });

    describe('createBulkUpdatePricingCommand', () => {
      it('should create valid bulk command', () => {
        // Given: Valid bulk command data
        const data = {
          productIds: ['product-1', 'product-2'],
          pricingStrategy: 'percentage' as PricingStrategy,
          pricingValue: 15,
          reason: 'Bulk discount',
          requestId: 'bulk-123',
          requestedBy: 'admin-456'
        };

        // When: Creating bulk command
        const command = createBulkUpdatePricingCommand(data);

        // Then: Should return valid command
        expect(command.productIds).toEqual(['product-1', 'product-2']);
        expect(command.pricingStrategy).toBe('percentage');
        expect(command.pricingValue).toBe(15);
        expect(command.reason).toBe('Bulk discount');
        expect(command.requestId).toBe('bulk-123');
        expect(command.requestedBy).toBe('admin-456');
      });

      it('should throw error for invalid bulk data', () => {
        // Given: Invalid bulk command data
        const invalidData = {
          productIds: [],
          pricingStrategy: 'percentage' as PricingStrategy,
          pricingValue: 15,
          reason: 'Bulk discount',
          requestId: 'bulk-123',
          requestedBy: 'admin-456'
        };

        // When: Creating bulk command with invalid data
        // Then: Should throw error
        expect(() => createBulkUpdatePricingCommand(invalidData)).toThrow('Invalid BulkUpdatePricingCommandDto data');
      });
    });

    describe('createPricingRule', () => {
      it('should create valid pricing rule', () => {
        // Given: Valid pricing rule data
        const data = {
          ruleId: 'rule-123',
          ruleType: 'percentage_discount' as PricingRuleType,
          name: 'Test Rule',
          value: 10,
          priority: 5,
          isActive: true
        };

        // When: Creating pricing rule
        const rule = createPricingRule(data);

        // Then: Should return valid rule with defaults
        expect(rule.ruleId).toBe('rule-123');
        expect(rule.ruleType).toBe('percentage_discount');
        expect(rule.name).toBe('Test Rule');
        expect(rule.value).toBe(10);
        expect(rule.priority).toBe(5);
        expect(rule.isActive).toBe(true);
        expect(rule.conditions).toEqual([]);
        expect(rule.metadata).toEqual({});
      });

      it('should throw error for invalid rule data', () => {
        // Given: Invalid pricing rule data
        const invalidData = {
          ruleId: '',
          ruleType: 'percentage_discount' as PricingRuleType,
          name: 'Test Rule',
          value: 10,
          priority: 5,
          isActive: true
        };

        // When: Creating pricing rule with invalid data
        // Then: Should throw error
        expect(() => createPricingRule(invalidData)).toThrow('Invalid PricingRuleDto data');
      });
    });
  });
});