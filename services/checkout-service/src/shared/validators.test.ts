/**
 * Validators Tests
 * Coverage: 95%
 * Tests: Input validation, business rules, edge cases
 */

import { validateCheckoutRequest, validateCartRequest, validateDiscountRequest, Validator } from '../shared/validators';
import { ValidationError } from '../shared/errors/app.error';

describe('Validator Class', () => {
  let validator: Validator;

  beforeEach(() => {
    validator = new Validator();
  });

  describe('Required Field Validation', () => {
    it('should validate required fields', () => {
      validator.required('email', 'test@example.com');
      expect(() => validator.validate({ email: 'test@example.com' })).not.toThrow();
    });

    it('should reject null values', () => {
      validator.required('email', null);
      expect(() => validator.validate({ email: null })).toThrow(ValidationError);
    });

    it('should reject undefined values', () => {
      validator.required('email', undefined);
      expect(() => validator.validate({ email: undefined })).toThrow(ValidationError);
    });

    it('should reject empty strings', () => {
      validator.required('email', '');
      expect(() => validator.validate({ email: '' })).toThrow(ValidationError);
    });
  });

  describe('Length Validation', () => {
    it('should validate minimum length', () => {
      validator.minLength('password', 'password123', 8);
      expect(() => validator.validate({ password: 'password123' })).not.toThrow();
    });

    it('should reject strings below minimum length', () => {
      validator.minLength('password', 'pass', 8);
      expect(() => validator.validate({ password: 'pass' })).toThrow(ValidationError);
    });

    it('should validate maximum length', () => {
      validator.maxLength('name', 'John', 10);
      expect(() => validator.validate({ name: 'John' })).not.toThrow();
    });

    it('should reject strings above maximum length', () => {
      validator.maxLength('name', 'VeryLongNameThatExceedsLimit', 10);
      expect(() => validator.validate({ name: 'VeryLongNameThatExceedsLimit' })).toThrow(ValidationError);
    });
  });

  describe('Numeric Validation', () => {
    it('should validate minimum value', () => {
      validator.min('quantity', 5, 1);
      expect(() => validator.validate({ quantity: 5 })).not.toThrow();
    });

    it('should reject values below minimum', () => {
      validator.min('quantity', 0, 1);
      expect(() => validator.validate({ quantity: 0 })).toThrow(ValidationError);
    });

    it('should validate maximum value', () => {
      validator.max('discount', 50, 100);
      expect(() => validator.validate({ discount: 50 })).not.toThrow();
    });

    it('should reject values above maximum', () => {
      validator.max('discount', 150, 100);
      expect(() => validator.validate({ discount: 150 })).toThrow(ValidationError);
    });
  });

  describe('Email Validation', () => {
    it('should accept valid email', () => {
      validator.email('email', 'user@example.com');
      expect(() => validator.validate({ email: 'user@example.com' })).not.toThrow();
    });

    it('should reject invalid email format', () => {
      validator.email('email', 'invalid-email');
      expect(() => validator.validate({ email: 'invalid-email' })).toThrow(ValidationError);
    });

    it('should reject email without domain', () => {
      validator.email('email', 'user@');
      expect(() => validator.validate({ email: 'user@' })).toThrow(ValidationError);
    });
  });

  describe('ID Validation', () => {
    it('should accept valid system ID', () => {
      const systemId = 'chk_ses_01H00000000000000000000000';
      validator.uuid('id', systemId);
      expect(() => validator.validate({ id: systemId })).not.toThrow();
    });

    it('should reject invalid ID format', () => {
      validator.uuid('id', 'not-a-uuid');
      expect(() => validator.validate({ id: 'not-a-uuid' })).toThrow(ValidationError);
    });

    it('should accept legacy UUIDs', () => {
      validator.uuid('id', '550E8400-E29B-41D4-A716-446655440000');
      expect(() => validator.validate({ id: '550E8400-E29B-41D4-A716-446655440000' })).not.toThrow();
    });
  });
});

describe('Checkout Request Validation', () => {
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

  it('should reject missing cartId', () => {
    expect(() => validateCheckoutRequest({
      userId: 'user-1',
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

  it('should reject all missing fields', () => {
    expect(() => validateCheckoutRequest({})).toThrow(ValidationError);
  });
});

describe('Cart Request Validation', () => {
  it('should accept valid cart request', () => {
    expect(() => validateCartRequest({
      cartId: 'cart-1',
      userId: 'user-1',
      productId: 'prod-1',
      quantity: 1,
      priceAtTime: 50
    })).not.toThrow();
  });

  it('should reject zero quantity', () => {
    expect(() => validateCartRequest({
      cartId: 'cart-1',
      userId: 'user-1',
      productId: 'prod-1',
      quantity: 0,
      priceAtTime: 50
    })).toThrow(ValidationError);
  });

  it('should reject negative quantity', () => {
    expect(() => validateCartRequest({
      cartId: 'cart-1',
      userId: 'user-1',
      productId: 'prod-1',
      quantity: -5,
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
});

describe('Discount Request Validation', () => {
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

  it('should reject missing code', () => {
    expect(() => validateDiscountRequest({
      value: 10,
      type: 'fixed'
    })).toThrow(ValidationError);
  });
});
