import { CheckoutEngine, CheckoutContext } from '../engines/checkout.engine';
import { PricingPolicy } from '../policies/pricing.policy';
import { Cart } from '../value-objects/cart.value-object';
import { Money } from '../value-objects/money.value-object';

describe('Checkout Security Tests', () => {
  let engine: CheckoutEngine;
  let pricingPolicy: PricingPolicy;

  beforeEach(() => {
    pricingPolicy = new PricingPolicy({
      taxRate: 0.1,
      shippingCost: 10
    });
    engine = new CheckoutEngine(pricingPolicy);
  });

  describe('Input Validation', () => {
    it('should reject negative quantities', () => {
      expect(() => new Cart({
        items: [{ productId: 'prod-1', quantity: -5, priceAtTime: 50 }]
      })).toThrow();
    });

    it('should reject zero quantities', () => {
      expect(() => new Cart({
        items: [{ productId: 'prod-1', quantity: 0, priceAtTime: 50 }]
      })).toThrow();
    });

    it('should reject negative prices', () => {
      expect(() => new Cart({
        items: [{ productId: 'prod-1', quantity: 1, priceAtTime: -50 }]
      })).toThrow();
    });

    it('should reject invalid discount percentages', () => {
      const discount = { code: 'TEST', value: 150, type: 'percentage' as const };
      expect(engine.canApplyDiscount(discount)).toBe(false);
    });

    it('should reject negative discounts', () => {
      const discount = { code: 'TEST', value: -10, type: 'fixed' as const };
      expect(engine.canApplyDiscount(discount)).toBe(false);
    });
  });

  describe('Overflow Protection', () => {
    it('should handle very large amounts safely', () => {
      const m1 = new Money(999999999.99);
      const m2 = new Money(0.01);
      const result = m1.add(m2);
      expect(result.getAmount()).toBeGreaterThan(0);
    });

    it('should prevent discount exceeding subtotal', () => {
      const context: CheckoutContext = {
        cart: new Cart({
          items: [{ productId: 'prod-1', quantity: 1, priceAtTime: 50 }]
        }),
        userId: 'user-1',
        shippingAddress: { id: 'addr-1', country: 'US' },
        billingAddress: { id: 'addr-2' },
        shippingMethod: { id: 'ship-1', cost: 10 },
        appliedDiscounts: [
          { code: 'HACK', value: 10000, type: 'fixed' }
        ]
      };

      const result = engine.calculatePricing(context);
      expect(result.pricing?.discountAmount.getAmount()).toBeLessThanOrEqual(50);
    });
  });

  describe('Precision Protection', () => {
    it('should prevent floating-point errors in calculations', () => {
      const m1 = new Money(0.1);
      const m2 = new Money(0.2);
      const m3 = new Money(0.3);
      
      const result = m1.add(m2);
      expect(result.isEqual(m3)).toBe(true);
    });

    it('should maintain precision through multiple operations', () => {
      let money = new Money(100);
      for (let i = 0; i < 100; i++) {
        money = money.multiply(0.99);
      }
      expect(money.getAmount()).toBeGreaterThan(0);
    });
  });

  describe('State Immutability', () => {
    it('should not modify original cart on add', () => {
      const original = new Cart({
        items: [{ productId: 'prod-1', quantity: 1, priceAtTime: 50 }]
      });
      const originalCount = original.getItemCount();
      
      original.addItem({ productId: 'prod-2', quantity: 1, priceAtTime: 50 });
      
      expect(original.getItemCount()).toBe(originalCount);
    });

    it('should not modify original cart on remove', () => {
      const original = new Cart({
        items: [
          { productId: 'prod-1', quantity: 1, priceAtTime: 50 },
          { productId: 'prod-2', quantity: 1, priceAtTime: 50 }
        ]
      });
      const originalCount = original.getItemCount();
      
      original.removeItem('prod-1');
      
      expect(original.getItemCount()).toBe(originalCount);
    });

    it('should not modify original money on operations', () => {
      const original = new Money(100);
      const originalAmount = original.getAmount();
      
      original.add(new Money(50));
      original.multiply(2);
      
      expect(original.getAmount()).toBe(originalAmount);
    });
  });

  describe('Boundary Conditions', () => {
    it('should handle minimum valid amount', () => {
      const money = new Money(0.01);
      expect(money.getAmount()).toBe(0.01);
    });

    it('should handle maximum valid amount', () => {
      const money = new Money(999999999.99);
      expect(money.getAmount()).toBe(999999999.99);
    });

    it('should handle zero amount', () => {
      const money = new Money(0);
      expect(money.isZero()).toBe(true);
    });

    it('should handle empty cart', () => {
      const cart = new Cart({ items: [] });
      expect(cart.isEmpty()).toBe(true);
      expect(cart.getSubtotal()).toBe(0);
    });

    it('should handle single item cart', () => {
      const cart = new Cart({
        items: [{ productId: 'prod-1', quantity: 1, priceAtTime: 50 }]
      });
      expect(cart.getItemCount()).toBe(1);
      expect(cart.getSubtotal()).toBe(50);
    });
  });
});
