import { CheckoutEngine, CheckoutContext } from '../checkout.engine';
import { PricingPolicy } from '../../policies/pricing.policy';
import { Cart } from '../../value-objects/cart.value-object';

describe('CheckoutEngine.engine', () => {
  let engine: CheckoutEngine;
  let policy: PricingPolicy;

  beforeEach(() => {
    policy = new PricingPolicy({
      taxRate: 0.1,
      shippingCost: 10,
      minOrderForFreeShipping: 100
    });
    engine = new CheckoutEngine(policy);
  });

  describe('Validation', () => {
    it('should validate complete context', () => {
      const context: CheckoutContext = {
        cart: new Cart({ items: [{ productId: 'prod-1', quantity: 1, priceAtTime: 50 }] }),
        userId: 'user-1',
        shippingAddress: { id: 'addr-1', country: 'US' },
        billingAddress: { id: 'addr-2' },
        shippingMethod: { id: 'ship-1', cost: 10 },
        appliedDiscounts: []
      };
      const result = engine.validate(context);
      expect(result.isValid).toBe(true);
      expect(result.canProceedToPayment).toBe(true);
    });

    it('should reject empty cart', () => {
      const context: CheckoutContext = {
        cart: new Cart({ items: [] }),
        userId: 'user-1',
        shippingAddress: { id: 'addr-1', country: 'US' },
        billingAddress: { id: 'addr-2' },
        shippingMethod: { id: 'ship-1', cost: 10 },
        appliedDiscounts: []
      };
      const result = engine.validate(context);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Cart is empty');
    });

    it('should reject missing shipping address', () => {
      const context: CheckoutContext = {
        cart: new Cart({ items: [{ productId: 'prod-1', quantity: 1, priceAtTime: 50 }] }),
        userId: 'user-1',
        billingAddress: { id: 'addr-2' },
        shippingMethod: { id: 'ship-1', cost: 10 },
        appliedDiscounts: []
      };
      const result = engine.validate(context);
      expect(result.errors).toContain('Shipping address is required');
    });

    it('should reject missing billing address', () => {
      const context: CheckoutContext = {
        cart: new Cart({ items: [{ productId: 'prod-1', quantity: 1, priceAtTime: 50 }] }),
        userId: 'user-1',
        shippingAddress: { id: 'addr-1', country: 'US' },
        shippingMethod: { id: 'ship-1', cost: 10 },
        appliedDiscounts: []
      };
      const result = engine.validate(context);
      expect(result.errors).toContain('Billing address is required');
    });

    it('should reject missing shipping method', () => {
      const context: CheckoutContext = {
        cart: new Cart({ items: [{ productId: 'prod-1', quantity: 1, priceAtTime: 50 }] }),
        userId: 'user-1',
        shippingAddress: { id: 'addr-1', country: 'US' },
        billingAddress: { id: 'addr-2' },
        appliedDiscounts: []
      };
      const result = engine.validate(context);
      expect(result.errors).toContain('Shipping method is required');
    });

    it('should collect multiple errors', () => {
      const context: CheckoutContext = {
        cart: new Cart({ items: [] }),
        userId: 'user-1',
        appliedDiscounts: []
      };
      const result = engine.validate(context);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('Pricing Calculation', () => {
    it('should calculate for valid context', () => {
      const context: CheckoutContext = {
        cart: new Cart({ items: [{ productId: 'prod-1', quantity: 2, priceAtTime: 50 }] }),
        userId: 'user-1',
        shippingAddress: { id: 'addr-1', country: 'US' },
        billingAddress: { id: 'addr-2' },
        shippingMethod: { id: 'ship-1', cost: 10 },
        appliedDiscounts: []
      };
      const result = engine.calculatePricing(context);
      expect(result.isValid).toBe(true);
      expect(result.pricing?.subtotal.getAmount()).toBe(100);
      expect(result.pricing?.total.getAmount()).toBe(120);
    });

    it('should fail for invalid context', () => {
      const context: CheckoutContext = {
        cart: new Cart({ items: [] }),
        userId: 'user-1',
        appliedDiscounts: []
      };
      const result = engine.calculatePricing(context);
      expect(result.isValid).toBe(false);
      expect(result.canProceedToPayment).toBe(false);
    });

    it('should apply fixed discount', () => {
      const context: CheckoutContext = {
        cart: new Cart({ items: [{ productId: 'prod-1', quantity: 1, priceAtTime: 100 }] }),
        userId: 'user-1',
        shippingAddress: { id: 'addr-1', country: 'US' },
        billingAddress: { id: 'addr-2' },
        shippingMethod: { id: 'ship-1', cost: 10 },
        appliedDiscounts: [{ code: 'SAVE10', value: 10, type: 'fixed' }]
      };
      const result = engine.calculatePricing(context);
      expect(result.pricing?.discountAmount.getAmount()).toBe(10);
      expect(result.pricing?.total.getAmount()).toBe(109);
    });

    it('should apply percentage discount', () => {
      const context: CheckoutContext = {
        cart: new Cart({ items: [{ productId: 'prod-1', quantity: 1, priceAtTime: 100 }] }),
        userId: 'user-1',
        shippingAddress: { id: 'addr-1', country: 'US' },
        billingAddress: { id: 'addr-2' },
        shippingMethod: { id: 'ship-1', cost: 10 },
        appliedDiscounts: [{ code: 'SAVE20', value: 20, type: 'percentage' }]
      };
      const result = engine.calculatePricing(context);
      expect(result.pricing?.discountAmount.getAmount()).toBe(20);
      expect(result.pricing?.total.getAmount()).toBe(98);
    });

    it('should apply multiple discounts', () => {
      const context: CheckoutContext = {
        cart: new Cart({ items: [{ productId: 'prod-1', quantity: 1, priceAtTime: 100 }] }),
        userId: 'user-1',
        shippingAddress: { id: 'addr-1', country: 'US' },
        billingAddress: { id: 'addr-2' },
        shippingMethod: { id: 'ship-1', cost: 10 },
        appliedDiscounts: [
          { code: 'SAVE10', value: 10, type: 'fixed' },
          { code: 'SAVE10PCT', value: 10, type: 'percentage' }
        ]
      };
      const result = engine.calculatePricing(context);
      expect(result.pricing?.discountAmount.getAmount()).toBe(20);
    });

    it('should cap discount at subtotal', () => {
      const context: CheckoutContext = {
        cart: new Cart({ items: [{ productId: 'prod-1', quantity: 1, priceAtTime: 50 }] }),
        userId: 'user-1',
        shippingAddress: { id: 'addr-1', country: 'US' },
        billingAddress: { id: 'addr-2' },
        shippingMethod: { id: 'ship-1', cost: 10 },
        appliedDiscounts: [{ code: 'HACK', value: 10000, type: 'fixed' }]
      };
      const result = engine.calculatePricing(context);
      expect(result.pricing?.discountAmount.getAmount()).toBeLessThanOrEqual(50);
    });

    it('should apply free shipping threshold', () => {
      const context: CheckoutContext = {
        cart: new Cart({ items: [{ productId: 'prod-1', quantity: 1, priceAtTime: 100 }] }),
        userId: 'user-1',
        shippingAddress: { id: 'addr-1', country: 'US' },
        billingAddress: { id: 'addr-2' },
        shippingMethod: { id: 'ship-1', cost: 10 },
        appliedDiscounts: []
      };
      const result = engine.calculatePricing(context);
      expect(result.pricing?.shippingCost.getAmount()).toBe(10);
    });
  });

  describe('Discount Validation', () => {
    it('should accept valid fixed discount', () => {
      expect(engine.canApplyDiscount({
        code: 'TEST',
        value: 50,
        type: 'fixed'
      })).toBe(true);
    });

    it('should accept valid percentage discount', () => {
      expect(engine.canApplyDiscount({
        code: 'TEST',
        value: 50,
        type: 'percentage'
      })).toBe(true);
    });

    it('should reject negative fixed discount', () => {
      expect(engine.canApplyDiscount({
        code: 'TEST',
        value: -10,
        type: 'fixed'
      })).toBe(false);
    });

    it('should reject negative percentage discount', () => {
      expect(engine.canApplyDiscount({
        code: 'TEST',
        value: -10,
        type: 'percentage'
      })).toBe(false);
    });

    it('should reject percentage over 100', () => {
      expect(engine.canApplyDiscount({
        code: 'TEST',
        value: 150,
        type: 'percentage'
      })).toBe(false);
    });

    it('should accept 0% discount', () => {
      expect(engine.canApplyDiscount({
        code: 'TEST',
        value: 0,
        type: 'percentage'
      })).toBe(true);
    });

    it('should accept 100% discount', () => {
      expect(engine.canApplyDiscount({
        code: 'TEST',
        value: 100,
        type: 'percentage'
      })).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle 100+ items', () => {
      const items = Array.from({ length: 100 }, (_, i) => ({
        productId: `prod-${i}`,
        quantity: 1,
        priceAtTime: 10
      }));
      const context: CheckoutContext = {
        cart: new Cart({ items }),
        userId: 'user-1',
        shippingAddress: { id: 'addr-1', country: 'US' },
        billingAddress: { id: 'addr-2' },
        shippingMethod: { id: 'ship-1', cost: 10 },
        appliedDiscounts: []
      };
      const result = engine.calculatePricing(context);
      expect(result.isValid).toBe(true);
      expect(result.pricing?.subtotal.getAmount()).toBe(1000);
    });

    it('should handle no discounts', () => {
      const context: CheckoutContext = {
        cart: new Cart({ items: [{ productId: 'prod-1', quantity: 1, priceAtTime: 50 }] }),
        userId: 'user-1',
        shippingAddress: { id: 'addr-1', country: 'US' },
        billingAddress: { id: 'addr-2' },
        shippingMethod: { id: 'ship-1', cost: 10 },
        appliedDiscounts: []
      };
      const result = engine.calculatePricing(context);
      expect(result.pricing?.discountAmount.getAmount()).toBe(0);
    });
  });
});
