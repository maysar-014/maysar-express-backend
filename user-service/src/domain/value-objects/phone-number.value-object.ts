/**
 * PhoneNumber value object - Immutable representation of a valid phone number
 * Contains all business rules for phone number validation and formatting
 */
export class PhoneNumber {
  private constructor(private readonly _value: string, private readonly _countryCode: string) {}

  /**
   * Factory method to create PhoneNumber instance
   */
  static create(value: string): PhoneNumber {
    const normalized = PhoneNumber.normalize(value);
    if (!PhoneNumber.isValid(normalized)) {
      throw new Error('Invalid phone number format');
    }

    const countryCode = PhoneNumber.extractCountryCode(normalized);
    return new PhoneNumber(normalized, countryCode);
  }

  /**
   * Creates PhoneNumber from trusted source (database, etc.)
   */
  static fromTrusted(value: string, countryCode?: string): PhoneNumber {
    const code = countryCode || PhoneNumber.extractCountryCode(value);
    return new PhoneNumber(value, code);
  }

  /**
   * Validates phone number format
   */
  static isValid(phone: string): boolean {
    if (!phone || typeof phone !== 'string') {
      return false;
    }

    // Tanzanian phone number patterns
    const tzPatterns = [
      /^\+255[67]\d{8}$/,  // +255 followed by 6 or 7 and 8 digits
      /^255[67]\d{8}$/,    // 255 followed by 6 or 7 and 8 digits
      /^0[67]\d{8}$/,      // 0 followed by 6 or 7 and 8 digits
      /^[67]\d{8}$/        // Just 6 or 7 and 8 digits
    ];

    return tzPatterns.some(pattern => pattern.test(phone));
  }

  /**
   * Normalizes phone number to international format
   */
  static normalize(phone: string): string {
    if (!phone) return '';

    // Remove all non-digit characters except +
    let normalized = phone.replace(/[^\d+]/g, '');

    // Handle Tanzanian numbers
    if (normalized.startsWith('0') && normalized.length === 10) {
      // Convert 07XXXXXXXX to +2557XXXXXXXX
      normalized = '+255' + normalized.substring(1);
    } else if (normalized.startsWith('255') && normalized.length === 12) {
      // Convert 255XXXXXXXXXX to +255XXXXXXXXXX
      normalized = '+' + normalized;
    } else if (!normalized.startsWith('+') && normalized.length === 9 && /^[67]/.test(normalized)) {
      // Convert 7XXXXXXXX to +2557XXXXXXXX
      normalized = '+255' + normalized;
    }

    return normalized;
  }

  /**
   * Extracts country code from phone number
   */
  static extractCountryCode(phone: string): string {
    if (phone.startsWith('+255')) {
      return '+255';
    } else if (phone.startsWith('255')) {
      return '+255';
    }
    return '+255'; // Default to Tanzania
  }

  /**
   * Checks if phone number is from Tanzania
   */
  isTanzanian(): boolean {
    return this._countryCode === '+255';
  }

  /**
   * Gets the carrier type (Airtel, Vodacom, Tigo, Halotel)
   */
  getCarrier(): string {
    if (!this.isTanzanian()) {
      return 'unknown';
    }

    const number = this._value.replace('+255', '');

    // Tanzanian carrier prefixes
    if (number.startsWith('6')) {
      if (number.startsWith('68') || number.startsWith('69')) {
        return 'airtel';
      } else if (number.startsWith('65') || number.startsWith('67')) {
        return 'vodacom';
      } else if (number.startsWith('61') || number.startsWith('62')) {
        return 'tigo';
      }
    } else if (number.startsWith('7')) {
      if (number.startsWith('71') || number.startsWith('72')) {
        return 'tigo';
      } else if (number.startsWith('73') || number.startsWith('74')) {
        return 'airtel';
      } else if (number.startsWith('75') || number.startsWith('76')) {
        return 'vodacom';
      } else if (number.startsWith('77') || number.startsWith('78')) {
        return 'halotel';
      }
    }

    return 'unknown';
  }

  /**
   * Checks if number is mobile
   */
  isMobile(): boolean {
    return this.isTanzanian() && /^[67]/.test(this._value.replace('+255', ''));
  }

  /**
   * Formats for display (e.g., +255 712 345 678)
   */
  formatForDisplay(): string {
    const number = this._value.replace('+255', '');
    if (number.length === 9) {
      return `+255 ${number.substring(0, 3)} ${number.substring(3, 6)} ${number.substring(6)}`;
    }
    return this._value;
  }

  /**
   * Formats for SMS (no spaces)
   */
  formatForSMS(): string {
    return this._value;
  }

  /**
   * Converts to string representation
   */
  toString(): string {
    return this._value;
  }

  /**
   * Value equality comparison
   */
  equals(other: PhoneNumber): boolean {
    return this._value === other._value;
  }

  /**
   * Gets the raw value (for persistence)
   */
  get value(): string {
    return this._value;
  }

  /**
   * Gets the country code
   */
  get countryCode(): string {
    return this._countryCode;
  }

  /**
   * Gets the national number (without country code)
   */
  getNationalNumber(): string {
    return this._value.replace(this._countryCode, '');
  }
}
