/**
 * RegistrationNumber value object - Tanzanian business registration format
 * Format: TZ-{region}-{number}
 */

import { InvalidRegistrationNumberError } from '../errors/business.errors';

export class RegistrationNumber {
  private constructor(private readonly _value: string) {}

  /**
   * Factory method to create RegistrationNumber instance
   */
  static create(value: string): RegistrationNumber {
    if (!RegistrationNumber.isValid(value)) {
      throw new InvalidRegistrationNumberError('Invalid registration number format. Expected: TZ-{region}-{number}');
    }
    return new RegistrationNumber(value.trim().toUpperCase());
  }

  /**
   * Validate Tanzanian business registration number format
   */
  static isValid(value: string): boolean {
    if (!value || typeof value !== 'string') {
      return false;
    }
    const trimmed = value.trim().toUpperCase();
    const tzRegex = /^TZ-[A-Z]{2,4}-\d{4,10}$/;
    return tzRegex.test(trimmed);
  }

  getValue(): string {
    return this._value;
  }

  getRegion(): string {
    const parts = this._value.split('-');
    return parts.length >= 2 ? parts[1] ?? '' : '';
  }

  getNumber(): string {
    const parts = this._value.split('-');
    return parts.length >= 3 ? parts[2] ?? '' : '';
  }

  equals(other: RegistrationNumber): boolean {
    return this._value === other._value;
  }

  isValid(): boolean {
    return RegistrationNumber.isValid(this._value);
  }

  toString(): string {
    return this._value;
  }
}
