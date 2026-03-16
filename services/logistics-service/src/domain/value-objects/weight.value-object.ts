export class Weight {
  private constructor(private readonly value: number, private readonly unit: 'kg' | 'lbs') {
    if (!['kg', 'lbs'].includes(unit)) {
      throw new Error('Invalid weight unit');
    }
    if (value < 0) {
      throw new Error('Weight cannot be negative');
    }

    const valueInKg = unit === 'lbs' ? value * 0.453592 : value;
    if (valueInKg > 1000) {
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
    const thisInKg = this.toKilograms();
    const otherInKg = other.toKilograms();
    return new Weight(thisInKg + otherInKg, 'kg');
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
