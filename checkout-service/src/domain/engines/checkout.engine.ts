/**
 * Checkout Engine
 * 
 * Orchestrates checkout business logic.
 * Makes decisions, computes state - no side effects.
 */

import { Cart } from '../value-objects/cart.value-object';
import { Money } from '../value-objects/money.value-object';
import { PricingPolicy, PricingCalculation } from '../policies/pricing.policy';

export interface CheckoutContext {
  cart: Cart;
  userId: string;
  shippingAddress?: {
    id: string;
    country: string;
  };
  billingAddress?: {
    id: string;
  };
  shippingMethod?: {
    id: string;
    cost: number;
  };
  appliedDiscounts: Array<{
    code: string;
    value: number;
    type: 'percentage' | 'fixed';
  }>;
}

export interface CheckoutResult {
  isValid: boolean;
  errors: string[];
  pricing?: PricingCalculation;
  canProceedToPayment: boolean;
}

export class CheckoutEngine {
  constructor(private pricingPolicy: PricingPolicy) {}

  validate(context: CheckoutContext): CheckoutResult {
    const errors: string[] = [];

    // Validate cart
    if (context.cart.isEmpty()) {
      errors.push('Cart is empty');
    }

    // Validate shipping address
    if (!context.shippingAddress) {
      errors.push('Shipping address is required');
    }

    // Validate billing address
    if (!context.billingAddress) {
      errors.push('Billing address is required');
    }

    // Validate shipping method
    if (!context.shippingMethod) {
      errors.push('Shipping method is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
      canProceedToPayment: errors.length === 0
    };
  }

  calculatePricing(context: CheckoutContext): CheckoutResult {
    const validationResult = this.validate(context);
    if (!validationResult.isValid) {
      return validationResult;
    }

    try {
      const subtotal = new Money(context.cart.getSubtotal());
      const discountAmount = this.calculateTotalDiscount(context.appliedDiscounts, subtotal);
      const shippingCost = context.shippingMethod
        ? new Money(context.shippingMethod.cost)
        : undefined;

      const pricing = this.pricingPolicy.calculateTotal(
        subtotal,
        discountAmount,
        shippingCost
      );

      return {
        isValid: true,
        errors: [],
        pricing,
        canProceedToPayment: true
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Pricing calculation failed'],
        canProceedToPayment: false
      };
    }
  }

  private calculateTotalDiscount(
    discounts: CheckoutContext['appliedDiscounts'],
    subtotal: Money
  ): Money {
    let totalDiscount = new Money(0);

    for (const discount of discounts) {
      let discountValue: Money;

      if (discount.type === 'percentage') {
        discountValue = subtotal.multiply(discount.value / 100);
      } else {
        discountValue = new Money(discount.value);
      }

      totalDiscount = totalDiscount.add(discountValue);
    }

    // Ensure discount doesn't exceed subtotal
    if (totalDiscount.isGreaterThan(subtotal)) {
      return subtotal;
    }

    return totalDiscount;
  }

  canApplyDiscount(discount: { code: string; value: number; type: 'percentage' | 'fixed' }): boolean {
    if (discount.type === 'percentage' && (discount.value < 0 || discount.value > 100)) {
      return false;
    }
    if (discount.type === 'fixed' && discount.value < 0) {
      return false;
    }
    return true;
  }
}
