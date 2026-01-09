export class Weight {
  private constructor(private readonly value: number, private readonly unit: 'kg' | 'lbs') {
    if (value < 0) {
      throw new Error('Weight cannot be negative');
    }
    if (value > 1000) {
      throw new Error('Weight cannot exceed 1000kg');
    }
  }

  static create(value: number, unit: 'kg' | 'lbs' = 'kg'): Weight {
    return new Weight(value, unit);
  }

  static fromKilograms(value: number): Weight {
    return new Weight(value, 'kg');
  }

  static fromPounds(value: number): Weight {
    return new Weight(value, 'lbs');
  }

  getValue(): number {
    return this.value;
  }

  getUnit(): 'kg' | 'lbs' {
    return this.unit;
  }

  toKilograms(): number {
    return this.unit === 'lbs' ? this.value * 0.453592 : this.value;
  }

  toPounds(): number {
    return this.unit === 'kg' ? this.value * 2.20462 : this.value;
  }

  add(other: Weight): Weight {
    const otherInSameUnit = other.unit === this.unit ? other.value : other.toKilograms();
    const thisInKg = this.toKilograms();
    return new Weight(thisInKg + otherInSameUnit, 'kg');
  }

  isGreaterThan(other: Weight): boolean {
    return this.toKilograms() > other.toKilograms();
  }

  isLessThan(other: Weight): boolean {
    return this.toKilograms() < other.toKilograms();
  }

  equals(other: Weight): boolean {
    return Math.abs(this.toKilograms() - other.toKilograms()) < 0.001;
  }

  toString(): string {
    return `${this.value}${this.unit}`;
  }
}
