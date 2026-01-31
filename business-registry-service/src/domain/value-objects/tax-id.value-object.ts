/**
 * TaxId value object - TIN (Taxpayer Identification Number) validation
 * Format: 9-digit number with optional checksum validation
 */

import { BusinessValidationError } from '../errors/business.errors';

export class TaxId {
  private constructor(private readonly _value: string) {}

  /**
   * Factory method to create TaxId instance
   */
  static create(value: string): TaxId {
    if (!TaxId.isValid(value)) {
      throw new BusinessValidationError('Invalid TIN format. Expected 9-digit number');
    }
    return new TaxId(value.replace(/\D/g, ''));
  }

  /**
   * Validate TIN format (9 digits)
   */
  static isValid(value: string): boolean {
    if (!value || typeof value !== 'string') {
      return false;
    }
    const digits = value.replace(/\D/g, '');
    return digits.length === 9 && /^\d{9}$/.test(digits);
  }

  /**
   * Validate TIN with checksum (Luhn-like validation for Tanzanian TIN)
   */
  static validateChecksum(value: string): boolean {
    if (!TaxId.isValid(value)) {
      return false;
    }
    const digits = value.replace(/\D/g, '');
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
      let digit = parseInt(digits[i] ?? '0', 10);
      if (i % 2 === 0) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
    }
    return sum % 10 === 0;
  }

  getValue(): string {
    return this._value;
  }

  equals(other: TaxId): boolean {
    return this._value === other._value;
  }

  isValid(): boolean {
    return TaxId.isValid(this._value);
  }

  toString(): string {
    return this._value;
  }
}
