import { PricingPolicy } from '../pricing.policy';
import { Money } from '../../value-objects/money.value-object';

describe('PricingPolicy.policy', () => {
  describe('Construction', () => {
    it('should create with valid config', () => {
      const policy = new PricingPolicy({
        taxRate: 0.1,
        shippingCost: 10
      });
      expect(policy).toBeDefined();
    });

    it('should reject invalid tax rate', () => {
      expect(() => new PricingPolicy({
        taxRate: -0.1,
        shippingCost: 10
      })).toThrow();

      expect(() => new PricingPolicy({
        taxRate: 1.5,
        shippingCost: 10
      })).toThrow();
    });

    it('should accept boundary tax rates', () => {
      expect(new PricingPolicy({ taxRate: 0, shippingCost: 10 })).toBeDefined();
      expect(new PricingPolicy({ taxRate: 1, shippingCost: 10 })).toBeDefined();
    });
  });

  describe('Basic Calculation', () => {
    it('should calculate with tax and shipping', () => {
      const policy = new PricingPolicy({
        taxRate: 0.1,
        shippingCost: 10
      });
      const result = policy.calculateTotal(new Money(100));
      expect(result.taxAmount.getAmount()).toBe(10);
      expect(result.shippingCost.getAmount()).toBe(10);
      expect(result.total.getAmount()).toBe(120);
    });

    it('should handle zero tax', () => {
      const policy = new PricingPolicy({
        taxRate: 0,
        shippingCost: 10
      });
      const result = policy.calculateTotal(new Money(100));
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
      const result = policy.calculateTotal(
        new Money(100),
        new Money(20)
      );
      expect(result.discountAmount.getAmount()).toBe(20);
      expect(result.total.getAmount()).toBe(98);
    });

    it('should reject discount exceeding subtotal', () => {
      const policy = new PricingPolicy({
        taxRate: 0.1,
        shippingCost: 10
      });
      expect(() => policy.calculateTotal(
        new Money(100),
        new Money(150)
      )).toThrow();
    });

    it('should enforce max discount', () => {
      const policy = new PricingPolicy({
        taxRate: 0.1,
        shippingCost: 10,
        maxDiscount: 50
      });
      expect(() => policy.calculateTotal(
        new Money(100),
        new Money(75)
      )).toThrow();
    });
  });

  describe('Shipping Calculation', () => {
    it('should use provided shipping', () => {
      const policy = new PricingPolicy({
        taxRate: 0.1,
        shippingCost: 10
      });
      const result = policy.calculateTotal(
        new Money(100),
        new Money(0),
        new Money(25)
      );
      expect(result.shippingCost.getAmount()).toBe(25);
    });

    it('should apply free shipping threshold', () => {
      const policy = new PricingPolicy({
        taxRate: 0.1,
        shippingCost: 10,
        minOrderForFreeShipping: 100
      });
      const result = policy.calculateTotal(new Money(100));
      expect(result.shippingCost.getAmount()).toBe(0);
    });

    it('should charge below threshold', () => {
      const policy = new PricingPolicy({
        taxRate: 0.1,
        shippingCost: 10,
        minOrderForFreeShipping: 100
      });
      const result = policy.calculateTotal(new Money(50));
      expect(result.shippingCost.getAmount()).toBe(10);
    });
  });

  describe('Tax Calculation', () => {
    it('should calculate on discounted subtotal', () => {
      const policy = new PricingPolicy({
        taxRate: 0.1,
        shippingCost: 0
      });
      const result = policy.calculateTotal(
        new Money(100),
        new Money(20)
      );
      expect(result.taxAmount.getAmount()).toBe(8);
    });

    it('should handle decimal tax rates', () => {
      const policy = new PricingPolicy({
        taxRate: 0.0825,
        shippingCost: 0
      });
      const result = policy.calculateTotal(new Money(100));
      expect(result.taxAmount.getAmount()).toBe(8.25);
    });

    it('should calculate before shipping', () => {
      const policy = new PricingPolicy({
        taxRate: 0.1,
        shippingCost: 10
      });
      const result = policy.calculateTotal(new Money(100));
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
      const result = policy.calculateTotal(
        new Money(200),
        new Money(50)
      );
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
      const result = policy.calculateTotal(
        new Money(150),
        new Money(30)
      );
      expect(result.shippingCost.getAmount()).toBe(0);
      expect(result.total.getAmount()).toBe(132);
    });
  });
});
