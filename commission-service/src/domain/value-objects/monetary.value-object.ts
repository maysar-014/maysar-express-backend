export class CommissionAmount {
  constructor(private readonly value: number) {
    if (value < 0) {
      throw new Error('Commission amount cannot be negative');
    }
    if (!Number.isFinite(value)) {
      throw new Error('Commission amount must be a finite number');
    }
    // Round to 2 decimal places
    this.value = Math.round(value * 100) / 100;
  }

  toNumber(): number {
    return this.value;
  }

  toString(): string {
    return this.value.toFixed(2);
  }

  add(other: CommissionAmount): CommissionAmount {
    return new CommissionAmount(this.value + other.value);
  }

  subtract(other: CommissionAmount): CommissionAmount {
    return new CommissionAmount(this.value - other.value);
  }

  multiply(factor: number): CommissionAmount {
    return new CommissionAmount(this.value * factor);
  }

  isGreaterThan(other: CommissionAmount): boolean {
    return this.value > other.value;
  }

  isZero(): boolean {
    return this.value === 0;
  }

  static zero(): CommissionAmount {
    return new CommissionAmount(0);
  }

  static fromNumber(value: number): CommissionAmount {
    return new CommissionAmount(value);
  }
}

export class CommissionRate {
  constructor(private readonly value: number) {
    if (value < 0 || value > 1) {
      throw new Error('Commission rate must be between 0 and 1');
    }
    if (!Number.isFinite(value)) {
      throw new Error('Commission rate must be a finite number');
    }
    // Round to 4 decimal places
    this.value = Math.round(value * 10000) / 10000;
  }

  toNumber(): number {
    return this.value;
  }

  toPercentage(): number {
    return this.value * 100;
  }

  toString(): string {
    return `${(this.value * 100).toFixed(2)}%`;
  }

  applyTo(amount: CommissionAmount): CommissionAmount {
    return new CommissionAmount(amount.toNumber() * this.value);
  }

  static fromPercentage(percentage: number): CommissionRate {
    return new CommissionRate(percentage / 100);
  }

  static fromDecimal(decimal: number): CommissionRate {
    return new CommissionRate(decimal);
  }
}

// PayoutAmount is an alias for CommissionAmount for semantic clarity
export { CommissionAmount as PayoutAmount };
