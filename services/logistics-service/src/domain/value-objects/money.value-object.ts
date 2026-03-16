export class Money {
  private constructor(
    private readonly amount: number,
    private readonly currency: string = 'TZS' // Tanzanian Shilling as default
  ) {
    if (amount < 0) {
      throw new Error('Amount must be non-negative');
    }
    if (!currency || currency.trim().length === 0) {
      throw new Error('Currency cannot be empty');
    }
  }

  static create(amount: number, currency: string = 'TZS'): Money {
    if (amount < 0) {
      throw new Error('Amount must be non-negative');
    }
    if (amount === 0) {
      throw new Error('Amount must be positive');
    }
    return new Money(amount, currency);
  }

  static zero(currency: string = 'TZS'): Money {
    return new Money(0, currency);
  }

  static fromTanzanianShillings(amount: number): Money {
    return new Money(amount, 'TZS');
  }

  static fromUSD(amount: number): Money {
    return new Money(amount, 'USD');
  }

  static fromCents(cents: number, currency: string = 'TZS'): Money {
    if (cents < 0) {
      throw new Error('Cents amount cannot be negative');
    }
    return new Money(cents / 100, currency);
  }

  getAmount(): number {
    return this.amount;
  }

  getCurrency(): string {
    return this.currency;
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error('Cannot operate on different currencies');
    }
    return new Money(this.amount + other.amount, this.currency);
  }

  subtract(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error('Cannot subtract money with different currencies');
    }
    if (this.amount < other.amount) {
      throw new Error('Cannot subtract: result would be negative');
    }
    return new Money(this.amount - other.amount, this.currency);
  }

  multiply(factor: number): Money {
    if (factor < 0) {
      throw new Error('Multiplication factor cannot be negative');
    }
    return new Money(this.amount * factor, this.currency);
  }

  divide(divisor: number): Money {
    if (divisor <= 0) {
      throw new Error('Division divisor must be positive');
    }
    return new Money(this.amount / divisor, this.currency);
  }

  isGreaterThan(other: Money): boolean {
    if (this.currency !== other.currency) {
      throw new Error('Cannot compare money with different currencies');
    }
    return this.amount > other.amount;
  }

  isGreaterThanOrEqual(other: Money): boolean {
    if (this.currency !== other.currency) {
      throw new Error('Cannot compare money with different currencies');
    }
    return this.amount >= other.amount;
  }

  isLessThan(other: Money): boolean {
    if (this.currency !== other.currency) {
      throw new Error('Cannot compare money with different currencies');
    }
    return this.amount < other.amount;
  }

  isLessThanOrEqual(other: Money): boolean {
    if (this.currency !== other.currency) {
      throw new Error('Cannot compare money with different currencies');
    }
    return this.amount <= other.amount;
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }

  isZero(): boolean {
    return this.amount === 0;
  }

  isPositive(): boolean {
    return this.amount > 0;
  }

  toString(): string {
    return `${this.amount.toLocaleString()} ${this.currency}`;
  }

  format(locale: string = 'en-US'): string {
    try {
      const formatted = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: this.currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(this.amount);
      return formatted.replace(/\u00A0/g, ' ');
    } catch (error) {
      // Fallback to simple formatting if locale is not supported
      return `${this.currency} ${this.amount.toLocaleString()}`;
    }
  }

  toJSON(): object {
    return {
      amount: this.amount,
      currency: this.currency
    };
  }

  // Utility method for percentage calculations
  percentage(percent: number): Money {
    if (percent < 0) {
      throw new Error('Percentage cannot be negative');
    }
    return new Money((this.amount * percent) / 100, this.currency);
  }

  // Round to nearest cent
  round(): Money {
    return new Money(Math.round(this.amount * 100) / 100, this.currency);
  }

  // Business rule: Validate delivery fee ranges
  isValidDeliveryFee(): boolean {
    // Delivery fee should be between 500 TZS and 50,000 TZS
    return this.amount >= 500 && this.amount < 50000 && this.currency === 'TZS';
  }

  // Business rule: Calculate courier earnings based on percentage
  calculateEarnings(percentage: number): Money {
    if (percentage < 0 || percentage > 1) {
      throw new Error('Percentage must be between 0 and 1');
    }
    return this.multiply(percentage);
  }
}
