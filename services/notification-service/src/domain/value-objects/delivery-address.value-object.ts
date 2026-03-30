/**
 * Delivery Address value object
 * Supports email addresses, phone numbers, device tokens
 */

export type DeliveryAddressType = 'email' | 'phone' | 'device_token';

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const PHONE_REGEX = /^(\+255|0)(7[0-9]|6[0-9]|2[0-9])\d{7}$/;
const DEVICE_TOKEN_MIN = 64;
const DEVICE_TOKEN_MAX = 256;

export class DeliveryAddress {
  private constructor(
    private readonly _value: string,
    private readonly _type: DeliveryAddressType
  ) {}

  static create(value: string, type: DeliveryAddressType): DeliveryAddress {
    const trimmed = value?.trim();
    if (!trimmed) throw new Error('Delivery address is required');

    switch (type) {
      case 'email':
        if (!EMAIL_REGEX.test(trimmed)) throw new Error('Invalid email format');
        return new DeliveryAddress(trimmed.toLowerCase(), type);
      case 'phone': {
        const normalized = trimmed.replace(/\s+/g, '');
        if (!PHONE_REGEX.test(normalized)) throw new Error('Invalid phone number format');
        return new DeliveryAddress(normalized, type);
      }
      case 'device_token':
        if (trimmed.length < DEVICE_TOKEN_MIN || trimmed.length > DEVICE_TOKEN_MAX) {
          throw new Error(`Device token must be between ${DEVICE_TOKEN_MIN} and ${DEVICE_TOKEN_MAX} characters`);
        }
        return new DeliveryAddress(trimmed, type);
      default:
        throw new Error(`Unsupported delivery address type: ${type}`);
    }
  }

  getValue(): string {
    return this._value;
  }

  getType(): DeliveryAddressType {
    return this._type;
  }

  isValid(): boolean {
    try {
      switch (this._type) {
        case 'email':
          return EMAIL_REGEX.test(this._value);
        case 'phone':
          return PHONE_REGEX.test(this._value);
        case 'device_token':
          return this._value.length >= DEVICE_TOKEN_MIN && this._value.length <= DEVICE_TOKEN_MAX;
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  equals(other: DeliveryAddress): boolean {
    return this._value === other._value && this._type === other._type;
  }

  toString(): string {
    return this._value;
  }
}
