/**
 * Pricing Policy
 * 
 * Business rules for calculating checkout totals.
 * Configurable, versioned, and testable.
 */

import { Money } from '../value-objects/money.value-object';

export interface PricingPolicyConfig {
  taxRate: number; // 0.0 to 1.0
  minOrderForFreeShipping?: number;
  shippingCost?: number;
  maxDiscount?: number;
}

export interface PricingCalculation {
  subtotal: Money;
  shippingCost: Money;
  taxAmount: Money;
  discountAmount: Money;
  total: Money;
}

export class PricingPolicy {
  private readonly config: PricingPolicyConfig;

  constructor(config: PricingPolicyConfig) {
    if (config.taxRate < 0 || config.taxRate > 1) {
      throw new Error('Tax rate must be between 0 and 1');
    }
    this.config = config;
  }

  calculateTotal(
    subtotal: Money,
    discountAmount: Money = new Money(0),
    shippingCost?: Money
  ): PricingCalculation {
    // Validate discount doesn't exceed subtotal
    if (discountAmount.isGreaterThan(subtotal)) {
      throw new Error('Discount cannot exceed subtotal');
    }

    // Validate max discount if configured
    if (this.config.maxDiscount) {
      const maxDiscount = new Money(this.config.maxDiscount);
      if (discountAmount.isGreaterThan(maxDiscount)) {
        throw new Error(`Discount cannot exceed ${this.config.maxDiscount}`);
      }
    }

    // Calculate after-discount subtotal
    const discountedSubtotal = subtotal.subtract(discountAmount);

    // Calculate shipping
    const finalShippingCost = this.calculateShipping(discountedSubtotal, shippingCost);

    // Calculate tax on discounted subtotal (before shipping)
    const taxAmount = discountedSubtotal.multiply(this.config.taxRate);

    // Calculate total
    const total = discountedSubtotal.add(taxAmount).add(finalShippingCost);

    return {
      subtotal,
      shippingCost: finalShippingCost,
      taxAmount,
      discountAmount,
      total
    };
  }

  private calculateShipping(subtotal: Money, providedShipping?: Money): Money {
    // If shipping provided, use it
    if (providedShipping) {
      return providedShipping;
    }

    // Check for free shipping threshold
    if (this.config.minOrderForFreeShipping) {
      const minOrder = new Money(this.config.minOrderForFreeShipping);
      if (subtotal.isGreaterThan(minOrder) || subtotal.isEqual(minOrder)) {
        return new Money(0);
      }
    }

    // Return configured shipping cost
    return new Money(this.config.shippingCost || 0);
  }
}
