import { ValueObject } from '@domain/interfaces';

/**
 * Phone Number Value Object
 * Represents a validated phone number with country code
 */
export class PhoneNumber implements ValueObject<string> {
  public readonly value: string;
  public readonly countryCode: string;
  public readonly nationalNumber: string;

  constructor(phoneNumber: string) {
    const normalized = this.normalize(phoneNumber);
    
    if (normalized !== '' && !this.isValidFormat(normalized)) {
      throw new Error(`Invalid phone number format: ${phoneNumber}`);
    }

    this.value = normalized;
    this.countryCode = this.extractCountryCode(normalized);
    this.nationalNumber = this.extractNationalNumber(normalized);
  }

  /**
   * Normalize phone number format
   */
  private normalize(phoneNumber: string): string {
    const raw = String(phoneNumber || '').trim();
    const hasPlus = raw.startsWith('+');
    let digits = raw.replace(/\D/g, '');

    if (!digits) {
      return raw;
    }

    // Normalize international prefix 00 -> +
    if (!hasPlus && digits.startsWith('00')) {
      digits = digits.slice(2);
      return `+${digits}`;
    }

    // Tanzania local format 0XXXXXXXXX -> +255XXXXXXXXX
    if (!hasPlus && digits.length === 10 && digits.startsWith('0')) {
      return `+255${digits.slice(1)}`;
    }

    // Tanzania without plus but with country code
    if (!hasPlus && digits.startsWith('255')) {
      const rest = digits.slice(3);
      if (rest.startsWith('0')) {
        return `+255${rest.slice(1)}`;
      }
      return `+${digits}`;
    }

    // Default: ensure leading +
    if (hasPlus && digits.startsWith('2550')) {
      return `+255${digits.slice(4)}`;
    }
    return `+${digits}`;
  }

  /**
   * Extract country code from phone number
   */
  private extractCountryCode(phoneNumber: string): string {
    // Extract country code (typically 1-3 digits after +)
    const match = phoneNumber.match(/^\+(\d{1,3})/);
    return match ? `+${match[1]}` : '';
  }

  /**
   * Extract national number from phone number
   */
  private extractNationalNumber(phoneNumber: string): string {
    const match = phoneNumber.match(/^\+\d{1,3}(.+)$/);
    return match ? match[1] || '' : '';
  }

  /**
   * Validate phone number format
   */
  private isValidFormat(phoneNumber: string): boolean {
    // Basic validation: + followed by 7-15 digits
    const phoneRegex = /^\+\d{7,15}$/;
    return phoneRegex.test(phoneNumber);
  }

  /**
   * Check if phone number is valid
   */
  isValid(): boolean {
    return this.isValidFormat(this.value);
  }

  /**
   * Check equality with another phone number
   */
  equals(other: PhoneNumber): boolean {
    return this.value === other.value;
  }

  /**
   * Get string representation
   */
  toString(): string {
    return this.value;
  }

  /**
   * Format phone number for display
   */
  formatForDisplay(): string {
    // Format as +XX XXX XXX XXXX
    const digits = this.nationalNumber;
    if (digits.length === 7) {
      return `${this.countryCode} ${digits.slice(0, 3)} ${digits.slice(3)}`;
    } else if (digits.length === 8) {
      return `${this.countryCode} ${digits.slice(0, 4)} ${digits.slice(4)}`;
    } else if (digits.length === 9) {
      return `${this.countryCode} ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    } else if (digits.length >= 10) {
      return `${this.countryCode} ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
    }
    return this.value;
  }

  /**
   * Check if phone number is from Tanzania
   */
  isTanzanian(): boolean {
    return this.countryCode === '+255';
  }

  /**
   * Get phone number type (mobile, landline, etc.)
   */
  getType(): 'mobile' | 'landline' | 'unknown' {
    if (!this.isTanzanian()) {
      return 'unknown';
    }

    const firstDigit = this.nationalNumber.charAt(0);
    
    // Tanzanian mobile numbers typically start with 6 or 7
    if (firstDigit === '6' || firstDigit === '7') {
      return 'mobile';
    }
    
    // Tanzanian landline numbers typically start with 2 or 8
    if (firstDigit === '2' || firstDigit === '8') {
      return 'landline';
    }

    return 'unknown';
  }

  /**
   * Create phone number from string
   */
  static create(phoneNumber: string): PhoneNumber {
    return new PhoneNumber(phoneNumber);
  }

  /**
   * Create phone number from country code and national number
   */
  static fromParts(countryCode: string, nationalNumber: string): PhoneNumber {
    return new PhoneNumber(`${countryCode}${nationalNumber}`);
  }

  /**
   * Check if a string is a valid phone number
   */
  static isValid(phoneNumber: string): boolean {
    try {
      const normalized = phoneNumber.replace(/[^\d+]/g, '');
      if (!normalized.startsWith('+')) {
        return false;
      }
      return /^\+\d{7,15}$/.test(normalized);
    } catch {
      return false;
    }
  }
}
