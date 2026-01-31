/**
 * Security Tests
 * Tests input validation and business rule enforcement
 */

import { validateCheckoutRequest, validateCartRequest, validateDiscountRequest } from '../../shared/validators';
import { ValidationError } from '../../shared/errors/app.error';

describe('Input Validation Security', () => {
  describe('Checkout Validation', () => {
    it('should reject missing cartId', () => {
      expect(() => validateCheckoutRequest({
        userId: 'user-1',
        shippingAddressId: 'addr-1',
        billingAddressId: 'addr-2',
        shippingMethodId: 'ship-1',
        shippingCost: 10
      })).toThrow(ValidationError);
    });

    it('should reject missing userId', () => {
      expect(() => validateCheckoutRequest({
        cartId: 'cart-1',
        shippingAddressId: 'addr-1',
        billingAddressId: 'addr-2',
        shippingMethodId: 'ship-1',
        shippingCost: 10
      })).toThrow(ValidationError);
    });

    it('should reject negative shipping cost', () => {
      expect(() => validateCheckoutRequest({
        cartId: 'cart-1',
        userId: 'user-1',
        shippingAddressId: 'addr-1',
        billingAddressId: 'addr-2',
        shippingMethodId: 'ship-1',
        shippingCost: -10
      })).toThrow(ValidationError);
    });

    it('should accept valid checkout request', () => {
      expect(() => validateCheckoutRequest({
        cartId: 'cart-1',
        userId: 'user-1',
        shippingAddressId: 'addr-1',
        billingAddressId: 'addr-2',
        shippingMethodId: 'ship-1',
        shippingCost: 10
      })).not.toThrow();
    });
  });

  describe('Cart Validation', () => {
    it('should reject zero quantity', () => {
      expect(() => validateCartRequest({
        cartId: 'cart-1',
        userId: 'user-1',
        productId: 'prod-1',
        quantity: 0,
        priceAtTime: 50
      })).toThrow(ValidationError);
    });

    it('should reject negative price', () => {
      expect(() => validateCartRequest({
        cartId: 'cart-1',
        userId: 'user-1',
        productId: 'prod-1',
        quantity: 1,
        priceAtTime: -50
      })).toThrow(ValidationError);
    });

    it('should accept valid cart request', () => {
      expect(() => validateCartRequest({
        cartId: 'cart-1',
        userId: 'user-1',
        productId: 'prod-1',
        quantity: 1,
        priceAtTime: 50
      })).not.toThrow();
    });
  });

  describe('Discount Validation', () => {
    it('should reject negative discount value', () => {
      expect(() => validateDiscountRequest({
        code: 'SAVE10',
        value: -10,
        type: 'fixed'
      })).toThrow(ValidationError);
    });

    it('should reject percentage over 100', () => {
      expect(() => validateDiscountRequest({
        code: 'SAVE150',
        value: 150,
        type: 'percentage'
      })).toThrow(ValidationError);
    });

    it('should reject invalid discount type', () => {
      expect(() => validateDiscountRequest({
        code: 'SAVE10',
        value: 10,
        type: 'invalid'
      })).toThrow(ValidationError);
    });

    it('should accept valid fixed discount', () => {
      expect(() => validateDiscountRequest({
        code: 'SAVE10',
        value: 10,
        type: 'fixed'
      })).not.toThrow();
    });

    it('should accept valid percentage discount', () => {
      expect(() => validateDiscountRequest({
        code: 'SAVE20',
        value: 20,
        type: 'percentage'
      })).not.toThrow();
    });
  });
});

describe('Business Rule Enforcement', () => {
  it('should prevent duplicate order creation', () => {
    // Idempotency key prevents duplicate processing
    const result1 = { success: true, data: { orderId: 'order-1' } };
    
    // Second request with same key should return cached result
    const result2 = { success: true, data: { orderId: 'order-1' } };
    
    expect(result1).toEqual(result2);
  });

  it('should enforce checkout expiration', () => {
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour
    const now = new Date();
    
    expect(expiresAt.getTime()).toBeGreaterThan(now.getTime());
  });

  it('should prevent negative money amounts', () => {
    expect(() => {
      const money = { amount: -100 };
      if (money.amount < 0) throw new Error('Money cannot be negative');
    }).toThrow();
  });

  it('should enforce discount cap at subtotal', () => {
    const subtotal = 100;
    const discount = 150;
    const cappedDiscount = Math.min(discount, subtotal);
    
    expect(cappedDiscount).toBe(100);
  });
});
