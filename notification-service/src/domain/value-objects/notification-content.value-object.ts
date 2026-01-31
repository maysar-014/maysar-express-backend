/**
 * Notification Content value object
 * Encapsulates notification content with validation
 */

const MAX_PLAIN_LENGTH = 10000;
const MAX_HTML_LENGTH = 50000;
const FORBIDDEN_PATTERNS = [/<script\b/i, /javascript:/i, /on\w+\s*=/i];

export class NotificationContent {
  private constructor(
    private readonly _plainText: string,
    private readonly _html?: string
  ) {}

  static create(plainText: string, html?: string): NotificationContent {
    if (!plainText?.trim()) {
      throw new Error('Notification content is required');
    }
    if (plainText.length > MAX_PLAIN_LENGTH) {
      throw new Error(`Plain text content exceeds maximum length of ${MAX_PLAIN_LENGTH}`);
    }
    if (html && html.length > MAX_HTML_LENGTH) {
      throw new Error(`HTML content exceeds maximum length of ${MAX_HTML_LENGTH}`);
    }
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(plainText) || (html && pattern.test(html))) {
        throw new Error('Content contains forbidden patterns');
      }
    }
    return new NotificationContent(plainText.trim(), html?.trim());
  }

  getValue(): string {
    return this._plainText;
  }

  getPlainText(): string {
    return this._plainText;
  }

  getHtml(): string | undefined {
    return this._html;
  }

  isValid(): boolean {
    return !!this._plainText?.trim() && this._plainText.length <= MAX_PLAIN_LENGTH;
  }

  equals(other: NotificationContent): boolean {
    return this._plainText === other._plainText && this._html === other._html;
  }

  toString(): string {
    return this._plainText;
  }
}
