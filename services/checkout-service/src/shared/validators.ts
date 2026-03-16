/**
 * Input Validation Framework
 * Validates requests and business rules
 */

import { ValidationError } from './errors/app.error';
import { isSystemId } from '@shared/ids/id';

export interface ValidationRule {
  field: string;
  validate: (value: any) => boolean;
  message: string;
}

export class Validator {
  private rules: ValidationRule[] = [];

  addRule(field: string, validate: (value: any) => boolean, message: string): this {
    this.rules.push({ field, validate, message });
    return this;
  }

  required(field: string, _value: any): this {
    return this.addRule(field, v => v !== null && v !== undefined && v !== '', `${field} is required`);
  }

  minLength(field: string, _value: any, min: number): this {
    return this.addRule(field, v => !v || v.length >= min, `${field} must be at least ${min} characters`);
  }

  maxLength(field: string, _value: any, max: number): this {
    return this.addRule(field, v => !v || v.length <= max, `${field} must be at most ${max} characters`);
  }

  min(field: string, _value: any, min: number): this {
    return this.addRule(field, v => v === null || v === undefined || v >= min, `${field} must be at least ${min}`);
  }

  max(field: string, _value: any, max: number): this {
    return this.addRule(field, v => !v || v <= max, `${field} must be at most ${max}`);
  }

  email(field: string, _value: any): this {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return this.addRule(field, v => !v || emailRegex.test(v), `${field} must be a valid email`);
  }

  uuid(field: string, _value: any): this {
    return this.addRule(field, v => !v || isSystemId(v), `${field} must be a valid ID`);
  }

  validate(data: Record<string, any>): void {
    const errors: Record<string, string> = {};

    for (const rule of this.rules) {
      const value = data[rule.field];
      if (!rule.validate(value)) {
        errors[rule.field] = rule.message;
      }
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationError('Validation failed', errors);
    }
  }
}

export function validateCheckoutRequest(data: any): void {
  const errors: Record<string, string> = {};

  if (!data.cartId) errors.cartId = 'Cart ID is required';
  if (!data.userId) errors.userId = 'User ID is required';
  if (!data.shippingAddressId) errors.shippingAddressId = 'Shipping address is required';
  if (!data.billingAddressId) errors.billingAddressId = 'Billing address is required';
  if (!data.shippingMethodId) errors.shippingMethodId = 'Shipping method is required';
  if (data.shippingCost === undefined || data.shippingCost < 0) {
    errors.shippingCost = 'Shipping cost must be non-negative';
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Checkout validation failed', errors);
  }
}

export function validateCartRequest(data: any): void {
  const errors: Record<string, string> = {};

  if (!data.cartId) errors.cartId = 'Cart ID is required';
  if (!data.userId) errors.userId = 'User ID is required';
  if (!data.productId) errors.productId = 'Product ID is required';
  if (!data.quantity || data.quantity <= 0) errors.quantity = 'Quantity must be greater than 0';
  if (data.priceAtTime === undefined || data.priceAtTime < 0) {
    errors.priceAtTime = 'Price must be non-negative';
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Cart validation failed', errors);
  }
}

export function validateDiscountRequest(data: any): void {
  const errors: Record<string, string> = {};

  if (!data.code) errors.code = 'Discount code is required';
  if (data.value === undefined || data.value < 0) errors.value = 'Discount value must be non-negative';
  if (!data.type || !['fixed', 'percentage'].includes(data.type)) {
    errors.type = 'Discount type must be fixed or percentage';
  }
  if (data.type === 'percentage' && data.value > 100) {
    errors.value = 'Percentage discount cannot exceed 100';
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Discount validation failed', errors);
  }
}
