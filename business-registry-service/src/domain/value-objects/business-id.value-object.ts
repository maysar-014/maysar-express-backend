/**
 * BusinessId value object - Immutable representation of a valid business identifier
 * Format: BIZ-{timestamp}-{random}
 */

export class BusinessId {
  private constructor(private readonly _value: string) {}

  /**
   * Factory method to create BusinessId instance
   */
  static create(value?: string): BusinessId {
    if (value) {
      if (!BusinessId.isValid(value)) {
        throw new Error('Invalid business ID format');
      }
      return new BusinessId(value);
    }
    return new BusinessId(BusinessId.generate());
  }

  /**
   * Generate a new unique business ID
   */
  static generate(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 11).toUpperCase();
    return `BIZ-${timestamp}-${random}`;
  }

  /**
   * Validate business ID format
   */
  static isValid(value: string): boolean {
    if (!value || typeof value !== 'string') {
      return false;
    }
    const bizIdRegex = /^BIZ-[A-Z0-9]+-[A-Z0-9]+$/i;
    return bizIdRegex.test(value.trim());
  }

  getValue(): string {
    return this._value;
  }

  equals(other: BusinessId): boolean {
    return this._value === other._value;
  }

  isValid(): boolean {
    return BusinessId.isValid(this._value);
  }

  toString(): string {
    return this._value;
  }
}
