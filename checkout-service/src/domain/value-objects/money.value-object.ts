/**
 * Money Value Object
 * Handles monetary calculations with precision
 */

export class Money {
  private readonly amountInCents: number;

  constructor(amountInDollars: number) {
    this.amountInCents = Math.round(amountInDollars * 100);
    if (this.amountInCents < 0) throw new Error('Money amount cannot be negative');
  }

  static fromCents(cents: number): Money {
    const money = Object.create(Money.prototype);
    money.amountInCents = cents;
    return money;
  }

  getAmount(): number {
    return this.amountInCents / 100;
  }

  getCents(): number {
    return this.amountInCents;
  }

  add(other: Money): Money {
    return Money.fromCents(this.amountInCents + other.amountInCents);
  }

  subtract(other: Money): Money {
    const result = this.amountInCents - other.amountInCents;
    if (result < 0) throw new Error('Cannot subtract more than available');
    return Money.fromCents(result);
  }

  multiply(factor: number): Money {
    if (factor < 0) throw new Error('Multiplication factor cannot be negative');
    return Money.fromCents(Math.round(this.amountInCents * factor));
  }

  isGreaterThan(other: Money): boolean {
    return this.amountInCents > other.amountInCents;
  }

  isLessThan(other: Money): boolean {
    return this.amountInCents < other.amountInCents;
  }

  isEqual(other: Money): boolean {
    return this.amountInCents === other.amountInCents;
  }

  isZero(): boolean {
    return this.amountInCents === 0;
  }
}
