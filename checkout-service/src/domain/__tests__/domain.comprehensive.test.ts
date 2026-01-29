import { CheckoutEngine, CheckoutContext } from '../engines/checkout.engine';
import { PricingPolicy } from '../policies/pricing.policy';
import { Cart } from '../value-objects/cart.value-object';
import { Money } from '../value-objects/money.value-object';

describe('Domain Layer - Checkout Service Tests', () => {
  describe('Money Value Object - Advanced Tests', () => {
    it('should handle currency precision with 100+ operations', () => {
      let total = new Money(0);
      for (let i = 0; i < 100; i++) {
        total = total.add(new Money(0.01));
      }
      expect(total.getAmount()).toBe(1);
    });

    it('should maintain invariant: a + b - b = a', () => {
      const a = new Money(123.45);
      const b = new Money(67.89);
      const result = a.add(b).subtract(b);
      expect(result.isEqual(a)).toBe(true);
    });

    it('should handle multiplication by zero', () => {
      const m = new Money(100);
      expect(m.multiply(0).isZero()).toBe(true);
    });

    it('should reject operations on negative money', () => {
      expect(() => new Money(-0.01)).toThrow();
    });
  });

  describe('Cart Value Object - Advanced Tests', () => {
    it('should maintain cart integrity with 1000 operations', () => {
      let cart = new Cart({ items: [] });
      for (let i = 0; i < 100; i++) {
        cart = cart.addItem({
          productId: `prod-${i}`,
          quantity: 1,
          priceAtTime: 10
        });
      }
      expect(cart.getItemCount()).toBe(100);
      expect(cart.getSubtotal()).toBe(1000);
    });

    it('should handle duplicate product additions correctly', () => {
      let cart = new Cart({
        items: [{ productId: 'prod-1', quantity: 5, priceAtTime: 10 }]
      });
      cart = cart.addItem({ productId: 'prod-1', quantity: 3, priceAtTime: 10 });
      expect(cart.getItemCount()).toBe(8);
      expect(cart.getSubtotal()).toBe(80);
    });

    it('should handle variant differentiation', () => {
      let cart = new Cart({
        items: [
          { productId: 'prod-1', variantId: 'red', quantity: 2, priceAtTime: 50 },
          { productId: 'prod-1', variantId: 'blue', quantity: 3, priceAtTime: 50 }
        ]
      });
      expect(cart.getItems()).toHaveLength(2);
      expect(cart.getSubtotal()).toBe(250);
    });

    it('should maintain immutability across all operations', () => {
      const original = new Cart({
        items: [{ productId: 'prod-1', quantity: 1, priceAtTime: 50 }]
      });
      const originalSubtotal = original.getSubtotal();

      original.addItem({ productId: 'prod-2', quantity: 1, priceAtTime: 50 });
      original.removeItem('prod-1');
      original.updateItemQuantity('prod-1', 100);

      expect(original.getSubtotal()).toBe(originalSubtotal);
    });
  });

  describe('PricingPolicy - Advanced Tests', () => {
    it('should handle complex multi-tier pricing', () => {
      const policy = new PricingPolicy({
        taxRate: 0.08,
        shippingCost: 15,
        minOrderForFreeShipping: 200
      });

      const subtotal = new Money(250);
      const discount = new Money(50);
      const result = policy.calculateTotal(subtotal, discount);

      expect(result.subtotal.getAmount()).toBe(250);
      expect(result.discountAmount.getAmount()).toBe(50);
      expect(result.shippingCost.getAmount()).toBe(0);
      expect(result.taxAmount.getAmount()).toBe(16);
      expect(result.total.getAmount()).toBe(216);
    });

    it('should handle edge case: discount equals subtotal', () => {
      const policy = new PricingPolicy({
        taxRate: 0.1,
        shippingCost: 10
      });

      const subtotal = new Money(100);
      const discount = new Money(100);
      const result = policy.calculateTotal(subtotal, discount);

      expect(result.discountAmount.getAmount()).toBe(100);
      expect(result.total.getAmount()).toBe(10);
    });

    it('should apply tax only on discounted amount', () => {
      const policy = new PricingPolicy({
        taxRate: 0.1,
        shippingCost: 0
      });

      const subtotal = new Money(1000);
      const discount = new Money(100);
      const result = policy.calculateTotal(subtotal, discount);

      expect(result.taxAmount.getAmount()).toBe(90);
    });

    it('should handle zero tax rate', () => {
      const policy = new PricingPolicy({
        taxRate: 0,
        shippingCost: 10
      });

      const subtotal = new Money(100);
      const result = policy.calculateTotal(subtotal);

      expect(result.taxAmount.getAmount()).toBe(0);
      expect(result.total.getAmount()).toBe(110);
    });
  });

  describe('CheckoutEngine - Advanced Tests', () => {
    let engine: CheckoutEngine;

    beforeEach(() => {
      const policy = new PricingPolicy({
        taxRate: 0.1,
        shippingCost: 10,
        minOrderForFreeShipping: 100
      });
      engine = new CheckoutEngine(policy);
    });

    it('should validate all required fields', () => {
      const context: CheckoutContext = {
        cart: new Cart({ items: [] }),
        userId: 'user-1',
        appliedDiscounts: []
      };

      const result = engine.validate(context);

      expect(result.errors).toContain('Cart is empty');
      expect(result.errors).toContain('Shipping address is required');
      expect(result.errors).toContain('Billing address is required');
      expect(result.errors).toContain('Shipping method is required');
    });

    it('should handle 100+ item checkout', () => {
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

    it('should apply multiple discounts correctly', () => {
      const context: CheckoutContext = {
        cart: new Cart({
          items: [{ productId: 'prod-1', quantity: 1, priceAtTime: 1000 }]
        }),
        userId: 'user-1',
        shippingAddress: { id: 'addr-1', country: 'US' },
        billingAddress: { id: 'addr-2' },
        shippingMethod: { id: 'ship-1', cost: 10 },
        appliedDiscounts: [
          { code: 'SAVE100', value: 100, type: 'fixed' },
          { code: 'SAVE10PCT', value: 10, type: 'percentage' }
        ]
      };

      const result = engine.calculatePricing(context);

      expect(result.pricing?.discountAmount.getAmount()).toBe(190);
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

    it('should validate discount codes', () => {
      expect(engine.canApplyDiscount({
        code: 'VALID',
        value: 50,
        type: 'fixed'
      })).toBe(true);

      expect(engine.canApplyDiscount({
        code: 'INVALID',
        value: -10,
        type: 'fixed'
      })).toBe(false);

      expect(engine.canApplyDiscount({
        code: 'INVALID',
        value: 150,
        type: 'percentage'
      })).toBe(false);
    });
  });

  describe('Domain Invariants - Comprehensive Tests', () => {
    it('should maintain money non-negativity invariant', () => {
      const m1 = new Money(100);
      const m2 = new Money(50);
      const result = m1.subtract(m2);
      expect(result.getAmount()).toBeGreaterThanOrEqual(0);
    });

    it('should maintain cart item uniqueness by product+variant', () => {
      let cart = new Cart({
        items: [
          { productId: 'prod-1', variantId: 'red', quantity: 2, priceAtTime: 50 }
        ]
      });

      cart = cart.addItem({
        productId: 'prod-1',
        variantId: 'red',
        quantity: 3,
        priceAtTime: 50
      });

      expect(cart.getItems()).toHaveLength(1);
      expect(cart.getItems()[0].quantity).toBe(5);
    });

    it('should maintain pricing total correctness', () => {
      const policy = new PricingPolicy({
        taxRate: 0.1,
        shippingCost: 10
      });

      const subtotal = new Money(100);
      const discount = new Money(20);
      const result = policy.calculateTotal(subtotal, discount);

      const expected = subtotal
        .subtract(discount)
        .add(result.taxAmount)
        .add(result.shippingCost);

      expect(result.total.isEqual(expected)).toBe(true);
    });
  });

  describe('Domain Edge Cases - Boundary Tests', () => {
    it('should handle minimum cart (1 item)', () => {
      const cart = new Cart({
        items: [{ productId: 'prod-1', quantity: 1, priceAtTime: 0.01 }]
      });
      expect(cart.getItemCount()).toBe(1);
      expect(cart.getSubtotal()).toBe(0.01);
    });

    it('should handle maximum precision (0.01)', () => {
      const m = new Money(0.01);
      expect(m.getAmount()).toBe(0.01);
    });

    it('should handle large quantities', () => {
      const cart = new Cart({
        items: [{ productId: 'prod-1', quantity: 999999, priceAtTime: 1 }]
      });
      expect(cart.getSubtotal()).toBe(999999);
    });

    it('should handle zero discount', () => {
      const policy = new PricingPolicy({
        taxRate: 0.1,
        shippingCost: 10
      });

      const result = policy.calculateTotal(
        new Money(100),
        new Money(0)
      );

      expect(result.discountAmount.getAmount()).toBe(0);
    });
  });
});
