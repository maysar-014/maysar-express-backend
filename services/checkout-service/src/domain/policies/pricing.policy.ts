/**
 * Pricing Policy
 * Business rules for calculating checkout totals
 */

import { Money } from '../value-objects/money.value-object';

export interface PricingPolicyConfig {
  taxRate: number;
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
    if (discountAmount.isGreaterThan(subtotal)) {
      throw new Error('Discount cannot exceed subtotal');
    }

    if (this.config.maxDiscount) {
      const maxDiscount = new Money(this.config.maxDiscount);
      if (discountAmount.isGreaterThan(maxDiscount)) {
        throw new Error(`Discount cannot exceed ${this.config.maxDiscount}`);
      }
    }

    const discountedSubtotal = subtotal.subtract(discountAmount);
    const finalShippingCost = this.calculateShipping(discountedSubtotal, shippingCost);
    const taxAmount = discountedSubtotal.multiply(this.config.taxRate);
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
    if (providedShipping) return providedShipping;

    if (this.config.minOrderForFreeShipping) {
      const minOrder = new Money(this.config.minOrderForFreeShipping);
      if (subtotal.isGreaterThan(minOrder) || subtotal.isEqual(minOrder)) {
        return new Money(0);
      }
    }

    return new Money(this.config.shippingCost || 0);
  }
}
