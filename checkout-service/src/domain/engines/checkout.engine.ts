/**
 * Checkout Engine
 * Orchestrates checkout validation and pricing calculation
 */

import { Cart } from '../value-objects/cart.value-object';
import { Money } from '../value-objects/money.value-object';
import { PricingPolicy, PricingCalculation } from '../policies/pricing.policy';

export interface Address {
  id: string;
  country?: string;
}

export interface ShippingMethod {
  id: string;
  cost: number;
}

export interface AppliedDiscount {
  code: string;
  value: number;
  type: 'fixed' | 'percentage';
}

export interface CheckoutContext {
  cart: Cart;
  userId: string;
  shippingAddress?: Address;
  billingAddress?: Address;
  shippingMethod?: ShippingMethod;
  appliedDiscounts: AppliedDiscount[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  canProceedToPayment: boolean;
}

export interface PricingResult {
  isValid: boolean;
  pricing?: PricingCalculation;
  canProceedToPayment: boolean;
  errors?: string[];
}

export class CheckoutEngine {
  constructor(private pricingPolicy: PricingPolicy) {}

  validate(context: CheckoutContext): ValidationResult {
    const errors: string[] = [];

    if (context.cart.isEmpty()) errors.push('Cart is empty');
    if (!context.shippingAddress) errors.push('Shipping address is required');
    if (!context.billingAddress) errors.push('Billing address is required');
    if (!context.shippingMethod) errors.push('Shipping method is required');

    return {
      isValid: errors.length === 0,
      errors,
      canProceedToPayment: errors.length === 0
    };
  }

  calculatePricing(context: CheckoutContext): PricingResult {
    const validation = this.validate(context);
    if (!validation.isValid) {
      return {
        isValid: false,
        canProceedToPayment: false,
        errors: validation.errors
      };
    }

    try {
      const subtotal = new Money(context.cart.getSubtotal());
      const discountAmount = this.calculateTotalDiscount(context.appliedDiscounts, subtotal);
      const shippingCost = context.shippingMethod
        ? new Money(context.shippingMethod.cost)
        : new Money(0);

      const pricing = this.pricingPolicy.calculateTotal(subtotal, discountAmount, shippingCost);

      return {
        isValid: true,
        pricing,
        canProceedToPayment: true
      };
    } catch (error) {
      return {
        isValid: false,
        canProceedToPayment: false,
        errors: [error instanceof Error ? error.message : 'Pricing calculation failed']
      };
    }
  }

  canApplyDiscount(discount: AppliedDiscount): boolean {
    if (discount.value < 0) return false;
    if (discount.type === 'percentage' && discount.value > 100) return false;
    return true;
  }

  private calculateTotalDiscount(discounts: AppliedDiscount[], subtotal: Money): Money {
    let totalDiscount = new Money(0);

    for (const discount of discounts) {
      if (!this.canApplyDiscount(discount)) continue;

      let discountAmount: Money;
      if (discount.type === 'fixed') {
        discountAmount = new Money(discount.value);
      } else {
        discountAmount = subtotal.multiply(discount.value / 100);
      }

      totalDiscount = totalDiscount.add(discountAmount);

      if (totalDiscount.isGreaterThan(subtotal)) {
        totalDiscount = subtotal;
        break;
      }
    }

    return totalDiscount;
  }
}
