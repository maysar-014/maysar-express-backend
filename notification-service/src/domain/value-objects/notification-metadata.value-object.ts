/**
 * Notification Metadata value object
 * Structured metadata storage for notifications
 */

const MAX_KEYS = 50;
const MAX_VALUE_LENGTH = 1000;

export class NotificationMetadata {
  private constructor(private readonly _data: Record<string, string | number | boolean>) {}

  static create(data: Record<string, string | number | boolean>): NotificationMetadata {
    const keys = Object.keys(data || {});
    if (keys.length > MAX_KEYS) {
      throw new Error(`Metadata cannot exceed ${MAX_KEYS} keys`);
    }
    for (const [k, v] of Object.entries(data || {})) {
      if (typeof v === 'string' && v.length > MAX_VALUE_LENGTH) {
        throw new Error(`Metadata value for ${k} exceeds maximum length`);
      }
    }
    return new NotificationMetadata({ ...(data || {}) });
  }

  get(key: string): string | number | boolean | undefined {
    return this._data[key];
  }

  set(key: string, value: string | number | boolean): NotificationMetadata {
    if (Object.keys(this._data).length >= MAX_KEYS && !(key in this._data)) {
      throw new Error(`Metadata cannot exceed ${MAX_KEYS} keys`);
    }
    if (typeof value === 'string' && value.length > MAX_VALUE_LENGTH) {
      throw new Error(`Metadata value exceeds maximum length of ${MAX_VALUE_LENGTH}`);
    }
    return new NotificationMetadata({ ...this._data, [key]: value });
  }

  merge(other: Record<string, string | number | boolean>): NotificationMetadata {
    const combined = { ...this._data, ...other };
    if (Object.keys(combined).length > MAX_KEYS) {
      throw new Error(`Metadata cannot exceed ${MAX_KEYS} keys`);
    }
    return new NotificationMetadata(combined);
  }

  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (Object.keys(this._data).length > MAX_KEYS) errors.push(`Maximum ${MAX_KEYS} keys allowed`);
    for (const [k, v] of Object.entries(this._data)) {
      if (typeof v === 'string' && v.length > MAX_VALUE_LENGTH) {
        errors.push(`Value for ${k} exceeds max length`);
      }
    }
    return { isValid: errors.length === 0, errors };
  }

  toObject(): Record<string, string | number | boolean> {
    return { ...this._data };
  }
}
