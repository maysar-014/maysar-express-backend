/**
 * Pricing Policy Tests
 * 
 * Coverage Target: 98% (critical business logic)
 * Tests: Tax calculation, discounts, shipping, edge cases
 */

import { PricingPolicy } from '../pricing.policy';
import { Money } from '../../value-objects/money.value-object';

describe('PricingPolicy', () => {
  describe('Construction', () => {
    it('should create policy with valid config', () => {
      const policy = new PricingPolicy({
        taxRate: 0.1,
        shippingCost: 10
      });

      expect(policy).toBeDefined();
    });

    it('should reject invalid tax rate below 0', () => {
      expect(() => new PricingPolicy({
        taxRate: -0.1,
        shippingCost: 10
      })).toThrow('Tax rate must be between 0 and 1');
    });

    it('should reject invalid tax rate above 1', () => {
      expect(() => new PricingPolicy({
        taxRate: 1.5,
        shippingCost: 10
      })).toThrow('Tax rate must be between 0 and 1');
    });

    it('should accept zero tax rate', () => {
      const policy = new PricingPolicy({
        taxRate: 0,
        shippingCost: 10
      });

      expect(policy).toBeDefined();
    });

    it('should accept 100% tax rate', () => {
      const policy = new PricingPolicy({
        taxRate: 1,
        shippingCost: 10
      });

      expect(policy).toBeDefined();
    });
  });

  describe('Basic Pricing Calculation', () => {
    it('should calculate total with tax and shipping', () => {
      const policy = new PricingPolicy({
        taxRate: 0.1,
        shippingCost: 10
      });

      const subtotal = new Money(100);
      const result = policy.calculateTotal(subtotal);

      expect(result.subtotal.getAmount()).toBe(100);
      expect(result.taxAmount.getAmount()).toBe(10);
      expect(result.shippingCost.getAmount()).toBe(10);
      expect(result.total.getAmount()).toBe(120);
    });

    it('should calculate without discount', () => {
      const policy = new PricingPolicy({
        taxRate: 0.08,
        shippingCost: 5
      });

      const subtotal = new Money(50);
      const result = policy.calculateTotal(subtotal);

      expect(result.discountAmount.getAmount()).toBe(0);
      expect(result.total.getAmount()).toBe(59);
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

  describe('Discount Handling', () => {
    it('should apply fixed discount', () => {
      const policy = new PricingPolicy({
        taxRate: 0.1,
        shippingCost: 10
      });

      const subtotal = new Money(100);
      const discount = new Money(20);
      const result = policy.calculateTotal(subtotal, discount);

      expect(result.discountAmount.getAmount()).toBe(20);
      expect(result.total.getAmount()).toBe(98);
    });

    it('should reject discount exceeding subtotal', () => {
      const policy = new PricingPolicy({
        taxRate: 0.1,
        shippingCost: 10
      });

      const subtotal = new Money(100);
      const discount = new Money(150);

      expect(() => policy.calculateTotal(subtotal, discount))
        .toThrow('Discount cannot exceed subtotal');
    });

    it('should apply max discount limit', () => {
      const policy = new PricingPolicy({
        taxRate: 0.1,
        shippingCost: 10,
        maxDiscount: 50
      });

      const subtotal = new Money(100);
      const discount = new Money(75);

      expect(() => policy.calculateTotal(subtotal, discount))
        .toThrow('Discount cannot exceed 50');
    });

    it('should allow discount equal to max', () => {
      const policy = new PricingPolicy({
        taxRate: 0.1,
        shippingCost: 10,
        maxDiscount: 50
      });

      const subtotal = new Money(100);
      const discount = new Money(50);
      const result = policy.calculateTotal(subtotal, discount);

      expect(result.discountAmount.getAmount()).toBe(50);
    });
  });

  describe('Shipping Calculation', () => {
    it('should use provided shipping cost', () => {
      const policy = new PricingPolicy({
        taxRate: 0.1,
        shippingCost: 10
      });

      const subtotal = new Money(100);
      const shipping = new Money(25);
      const result = policy.calculateTotal(subtotal, new Money(0), shipping);

      expect(result.shippingCost.getAmount()).toBe(25);
    });

    it('should apply free shipping threshold', () => {
      const policy = new PricingPolicy({
        taxRate: 0.1,
        shippingCost: 10,
        minOrderForFreeShipping: 100
      });

      const subtotal = new Money(100);
      const result = policy.calculateTotal(subtotal);

      expect(result.shippingCost.getAmount()).toBe(0);
    });

    it('should charge shipping below threshold', () => {
      const policy = new PricingPolicy({
        taxRate: 0.1,
        shippingCost: 10,
        minOrderForFreeShipping: 100
      });

      const subtotal = new Money(50);
      const result = policy.calculateTotal(subtotal);

      expect(result.shippingCost.getAmount()).toBe(10);
    });

    it('should apply free shipping at exact threshold', () => {
      const policy = new PricingPolicy({
        taxRate: 0.1,
        shippingCost: 10,
        minOrderForFreeShipping: 100
      });

      const subtotal = new Money(100);
      const result = policy.calculateTotal(subtotal);

      expect(result.shippingCost.getAmount()).toBe(0);
    });
  });

  describe('Tax Calculation', () => {
    it('should calculate tax on discounted subtotal', () => {
      const policy = new PricingPolicy({
        taxRate: 0.1,
        shippingCost: 0
      });

      const subtotal = new Money(100);
      const discount = new Money(20);
      const result = policy.calculateTotal(subtotal, discount);

      expect(result.taxAmount.getAmount()).toBe(8);
    });

    it('should handle decimal tax rates', () => {
      const policy = new PricingPolicy({
        taxRate: 0.0825,
        shippingCost: 0
      });

      const subtotal = new Money(100);
      const result = policy.calculateTotal(subtotal);

      expect(result.taxAmount.getAmount()).toBe(8.25);
    });

    it('should calculate tax before shipping', () => {
      const policy = new PricingPolicy({
        taxRate: 0.1,
        shippingCost: 10
      });

      const subtotal = new Money(100);
      const result = policy.calculateTotal(subtotal);

      // Tax on 100, not on 110
      expect(result.taxAmount.getAmount()).toBe(10);
      expect(result.total.getAmount()).toBe(120);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle discount + tax + shipping', () => {
      const policy = new PricingPolicy({
        taxRate: 0.08,
        shippingCost: 15
      });

      const subtotal = new Money(200);
      const discount = new Money(50);
      const result = policy.calculateTotal(subtotal, discount);

      expect(result.subtotal.getAmount()).toBe(200);
      expect(result.discountAmount.getAmount()).toBe(50);
      expect(result.taxAmount.getAmount()).toBe(12);
      expect(result.shippingCost.getAmount()).toBe(15);
      expect(result.total.getAmount()).toBe(177);
    });

    it('should handle free shipping with discount', () => {
      const policy = new PricingPolicy({
        taxRate: 0.1,
        shippingCost: 10,
        minOrderForFreeShipping: 100
      });

      const subtotal = new Money(150);
      const discount = new Money(30);
      const result = policy.calculateTotal(subtotal, discount);

      expect(result.shippingCost.getAmount()).toBe(0);
      expect(result.total.getAmount()).toBe(132);
    });

    it('should handle zero subtotal', () => {
      const policy = new PricingPolicy({
        taxRate: 0.1,
        shippingCost: 10
      });

      const subtotal = new Money(0);
      const result = policy.calculateTotal(subtotal);

      expect(result.total.getAmount()).toBe(10);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small amounts', () => {
      const policy = new PricingPolicy({
        taxRate: 0.1,
        shippingCost: 0
      });

      const subtotal = new Money(0.01);
      const result = policy.calculateTotal(subtotal);

      expect(result.total.getAmount()).toBeGreaterThan(0);
    });

    it('should handle large amounts', () => {
      const policy = new PricingPolicy({
        taxRate: 0.1,
        shippingCost: 100
      });

      const subtotal = new Money(10000);
      const result = policy.calculateTotal(subtotal);

      expect(result.total.getAmount()).toBe(11100);
    });
  });
});
