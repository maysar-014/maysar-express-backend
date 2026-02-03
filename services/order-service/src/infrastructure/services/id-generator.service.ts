/**
 * Enterprise ID Generator Service
 * Generates professional, branded identifiers for Maysar entities
 */

export class IdGeneratorService {
  private static readonly MAYSAR_PREFIX = 'MSR';
  private static readonly ORDER_PREFIX = 'ORD';
  private static readonly SEPARATOR = '-';

  /**
   * Generates a professional Maysar Order ID
   * Format: MSR-ORD-YYYYMMDD-TIMESTAMP-RANDOM
   * Example: MSR-ORD-20260113-173418-4A7B
   */
  static generateOrderId(): string {
    const now = new Date();
    const timestamp = this.formatTimestamp(now);
    const randomSuffix = this.generateRandomSuffix(4);

    return [
      this.MAYSAR_PREFIX,
      this.ORDER_PREFIX,
      timestamp,
      randomSuffix
    ].join(this.SEPARATOR);
  }

  /**
   * Generates a shorter order ID for display purposes
   * Format: MSR-ORD-TIMESTAMP
   * Example: MSR-ORD-1734184A7B
   */
  static generateShortOrderId(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();

    return [
      this.MAYSAR_PREFIX,
      this.ORDER_PREFIX,
      timestamp + randomSuffix
    ].join(this.SEPARATOR);
  }

  /**
   * Generates a transaction ID for payments
   * Format: MSR-TXN-TIMESTAMP-RANDOM
   * Example: MSR-TXN-20260113-173418-9C2D
   */
  static generateTransactionId(): string {
    const now = new Date();
    const timestamp = this.formatTimestamp(now);
    const randomSuffix = this.generateRandomSuffix(4);

    return [
      this.MAYSAR_PREFIX,
      'TXN',
      timestamp,
      randomSuffix
    ].join(this.SEPARATOR);
  }

  /**
   * Generates a delivery tracking ID
   * Format: MSR-TRK-TIMESTAMP-RANDOM
   * Example: MSR-TRK-20260113-173418-7F1E
   */
  static generateTrackingId(): string {
    const now = new Date();
    const timestamp = this.formatTimestamp(now);
    const randomSuffix = this.generateRandomSuffix(4);

    return [
      this.MAYSAR_PREFIX,
      'TRK',
      timestamp,
      randomSuffix
    ].join(this.SEPARATOR);
  }

  /**
   * Validates if a string is a valid Maysar Order ID
   */
  static isValidOrderId(id: string): boolean {
    const pattern = /^MSR-ORD-\d{8}-\d{6}-[A-F0-9]{4}$/;
    return pattern.test(id);
  }

  /**
   * Validates if a string is a valid Maysar Transaction ID
   */
  static isValidTransactionId(id: string): boolean {
    const pattern = /^MSR-TXN-\d{8}-\d{6}-[A-F0-9]{4}$/;
    return pattern.test(id);
  }

  /**
   * Validates if a string is a valid Maysar Tracking ID
   */
  static isValidTrackingId(id: string): boolean {
    const pattern = /^MSR-TRK-\d{8}-\d{6}-[A-F0-9]{4}$/;
    return pattern.test(id);
  }

  /**
   * Extracts timestamp from a Maysar ID
   */
  static extractTimestamp(id: string): Date | null {
    const parts = id.split(this.SEPARATOR);
    if (parts.length >= 4 && parts[0] === this.MAYSAR_PREFIX) {
      const dateStr = parts[2]; // YYYYMMDD
      const timeStr = parts[3]; // HHMMSS

      if (dateStr.length === 8 && timeStr.length === 6) {
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        const hour = timeStr.substring(0, 2);
        const minute = timeStr.substring(2, 4);
        const second = timeStr.substring(4, 6);

        return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
      }
    }
    return null;
  }

  // Private helper methods

  private static formatTimestamp(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}${month}${day}-${hours}${minutes}${seconds}`;
  }

  private static generateRandomSuffix(length: number): string {
    const chars = '0123456789ABCDEF';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generates a batch of order IDs for bulk operations
   */
  static generateOrderIds(count: number): string[] {
    const ids: string[] = [];
    for (let i = 0; i < count; i++) {
      ids.push(this.generateOrderId());
    }
    return ids;
  }
}
