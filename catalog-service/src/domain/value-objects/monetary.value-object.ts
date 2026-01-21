/**
 * Monetary Value Objects
 * Domain-specific monetary values for catalog pricing
 */

export class Price {
  constructor(
    private readonly amount: number,
    private readonly currency: string = 'USD'
  ) {
    if (amount < 0) {
      throw new Error('Price cannot be negative');
    }
    if (!Number.isFinite(amount)) {
      throw new Error('Price must be a finite number');
    }
    if (!currency || currency.length !== 3) {
      throw new Error('Currency must be a 3-letter code');
    }
  }

  toNumber(): number {
    return this.amount;
  }

  getCurrency(): string {
    return this.currency;
  }

  add(other: Price): Price {
    if (this.currency !== other.currency) {
      throw new Error('Cannot add prices with different currencies');
    }
    return new Price(this.amount + other.amount, this.currency);
  }

  subtract(other: Price): Price {
    if (this.currency !== other.currency) {
      throw new Error('Cannot subtract prices with different currencies');
    }
    if (this.amount < other.amount) {
      throw new Error('Cannot subtract: result would be negative');
    }
    return new Price(this.amount - other.amount, this.currency);
  }

  multiply(factor: number): Price {
    if (factor < 0) {
      throw new Error('Multiplication factor cannot be negative');
    }
    return new Price(this.amount * factor, this.currency);
  }

  divide(divisor: number): Price {
    if (divisor <= 0) {
      throw new Error('Divisor must be positive');
    }
    return new Price(this.amount / divisor, this.currency);
  }

  equals(other: Price): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }

  isGreaterThan(other: Price): boolean {
    if (this.currency !== other.currency) {
      throw new Error('Cannot compare prices with different currencies');
    }
    return this.amount > other.amount;
  }

  isLessThan(other: Price): boolean {
    if (this.currency !== other.currency) {
      throw new Error('Cannot compare prices with different currencies');
    }
    return this.amount < other.amount;
  }

  format(): string {
    return `${this.currency} ${this.amount.toFixed(2)}`;
  }
}

export class WholesaleTier {
  constructor(
    private readonly minQuantity: number,
    private readonly discountPercentage: number
  ) {
    if (minQuantity < 1) {
      throw new Error('Minimum quantity must be at least 1');
    }
    if (discountPercentage < 0 || discountPercentage > 100) {
      throw new Error('Discount percentage must be between 0 and 100');
    }
  }

  getMinQuantity(): number {
    return this.minQuantity;
  }

  getDiscountPercentage(): number {
    return this.discountPercentage;
  }

  applyTo(basePrice: Price): Price {
    const discountFactor = (100 - this.discountPercentage) / 100;
    return basePrice.multiply(discountFactor);
  }

  isApplicable(quantity: number): boolean {
    return quantity >= this.minQuantity;
  }
}

export class WholesalePricing {
  constructor(
    private readonly unitPrice: Price,
    private readonly bulkTiers: WholesaleTier[] = []
  ) {
    if (bulkTiers.length > 0) {
      // Validate tiers are in ascending order
      for (let i = 1; i < bulkTiers.length; i++) {
        if (bulkTiers[i].getMinQuantity() <= bulkTiers[i - 1].getMinQuantity()) {
          throw new Error('Bulk tiers must have increasing minimum quantities');
        }
      }
    }
  }

  getUnitPrice(): Price {
    return this.unitPrice;
  }

  getBulkTiers(): WholesaleTier[] {
    return [...this.bulkTiers];
  }

  calculatePrice(quantity: number): Price {
    if (quantity <= 0) {
      throw new Error('Quantity must be positive');
    }

    // Find the best applicable tier (highest discount)
    let applicableTier: WholesaleTier | null = null;
    for (const tier of this.bulkTiers) {
      if (tier.isApplicable(quantity)) {
        applicableTier = tier;
      }
    }

    if (applicableTier) {
      return applicableTier.applyTo(this.unitPrice).multiply(quantity);
    }

    return this.unitPrice.multiply(quantity);
  }

  getBestTier(quantity: number): WholesaleTier | null {
    let bestTier: WholesaleTier | null = null;
    for (const tier of this.bulkTiers) {
      if (tier.isApplicable(quantity)) {
        bestTier = tier;
      }
    }
    return bestTier;
  }
}

export class CostPrice {
  constructor(private readonly amount: number) {
    if (amount < 0) {
      throw new Error('Cost price cannot be negative');
    }
    if (!Number.isFinite(amount)) {
      throw new Error('Cost price must be a finite number');
    }
  }

  toNumber(): number {
    return this.amount;
  }

  calculateMargin(sellingPrice: Price): number {
    const margin = ((sellingPrice.toNumber() - this.amount) / this.amount) * 100;
    return Math.round(margin * 100) / 100; // Round to 2 decimal places
  }

  calculateMarkup(sellingPrice: Price): number {
    const markup = ((sellingPrice.toNumber() - this.amount) / this.amount) * 100;
    return Math.round(markup * 100) / 100;
  }

  isProfitable(sellingPrice: Price): boolean {
    return sellingPrice.toNumber() > this.amount;
  }
}
