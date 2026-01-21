/**
 * Email value object - Immutable representation of a valid email address
 * Contains all business rules for email validation and formatting
 */
export class Email {
  private constructor(private readonly _value: string) {}

  /**
   * Factory method to create Email instance
   */
  static create(value: string): Email {
    if (!Email.isValid(value)) {
      throw new Error('Invalid email format');
    }

    return new Email(value.toLowerCase().trim());
  }

  /**
   * Creates Email from trusted source (database, etc.)
   */
  static fromTrusted(value: string): Email {
    return new Email(value);
  }

  /**
   * Validates email format using RFC 5322 compliant regex
   */
  static isValid(email: string): boolean {
    if (!email || typeof email !== 'string') {
      return false;
    }

    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    return emailRegex.test(email.trim());
  }

  /**
   * Gets the domain part of the email
   */
  getDomain(): string {
    const atIndex = this._value.indexOf('@');
    return atIndex !== -1 ? this._value.substring(atIndex + 1) : '';
  }

  /**
   * Gets the local part of the email (before @)
   */
  getLocalPart(): string {
    const atIndex = this._value.indexOf('@');
    return atIndex !== -1 ? this._value.substring(0, atIndex) : this._value;
  }

  /**
   * Checks if email is from a specific domain
   */
  isFromDomain(domain: string): boolean {
    return this.getDomain().toLowerCase() === domain.toLowerCase();
  }

  /**
   * Checks if email is from a trusted domain
   */
  isTrustedDomain(): boolean {
    const trustedDomains = [
      'gmail.com',
      'yahoo.com',
      'hotmail.com',
      'outlook.com',
      'maysar.com',
      'maysar.co.tz'
    ];

    return trustedDomains.some(domain => this.isFromDomain(domain));
  }

  /**
   * Checks if email is a system email
   */
  isSystemEmail(): boolean {
    return this._value.endsWith('@maysar.com') ||
           this._value.endsWith('@maysar.co.tz') ||
           this._value === 'noreply@maysar.com';
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
  equals(other: Email): boolean {
    return this._value === other._value;
  }

  /**
   * Gets the raw value (for persistence)
   */
  get value(): string {
    return this._value;
  }
}
