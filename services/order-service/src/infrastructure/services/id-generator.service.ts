/**
 * Enterprise ID Generator Service
 * Generates professional, branded identifiers for Maysar entities.
 *
 * Every identifier follows the human-readable contract defined once in
 * `shared/ids/human-readable-ids.ts`:
 *
 *   Order number              ORD-YYYYMMDD-NLNL   e.g. ORD-20260927-3C8B
 *   Shipment tracking number  TRK-NLNLNL          e.g. TRK-3C8B2D
 *   Transaction id            TXN-YYYYMMDD-NLNL   e.g. TXN-20260927-3C8B
 *
 * `N` is a digit from 2-9 and `L` a letter from A-Z without I, L and O
 * (0/1/O/I/L are excluded so a value cannot be mis-read as another value).
 *
 * Separation rule: the ORDER NUMBER identifies the whole order for its entire
 * lifecycle and is never used as a shipment identifier — one order can contain
 * several shipments and each shipment carries its own TRK- tracking number.
 */

import {
  extractIdentifierDate,
  isOrderNumber,
  isShipmentTrackingNumber,
  isTransactionId,
  makeOrderNumber,
  makeShipmentTrackingNumber,
  makeTransactionId,
} from '@shared/ids/human-readable-ids';

export class IdGeneratorService {
  /** Prefix of the order number (`ORD-YYYYMMDD-NLNL`). */
  static readonly ORDER_PREFIX = 'ORD';

  /** Prefix of an independent shipment tracking number (`TRK-NLNLNL`). */
  static readonly SHIPMENT_TRACKING_PREFIX = 'TRK';

  /** Prefix of a transaction id (`TXN-YYYYMMDD-NLNL`). */
  static readonly TRANSACTION_PREFIX = 'TXN';

  /**
   * Generates an order number.
   * Format: ORD-YYYYMMDD-NLNL
   * Example: ORD-20260927-3C8B
   */
  static generateOrderId(date: Date = new Date()): string {
    return makeOrderNumber(date);
  }

  /**
   * Generates an independent shipment tracking number.
   * Format: TRK-NLNLNL
   * Example: TRK-3C8B2D
   */
  static generateShipmentTrackingNumber(): string {
    return makeShipmentTrackingNumber();
  }

  /**
   * Generates a transaction id for payments.
   * Format: TXN-YYYYMMDD-NLNL
   * Example: TXN-20260927-3C8B
   */
  static generateTransactionId(date: Date = new Date()): string {
    return makeTransactionId(date);
  }

  /**
   * Validates an order number (`ORD-YYYYMMDD-NLNL`).
   */
  static isValidOrderId(id: string): boolean {
    return isOrderNumber(id);
  }

  /**
   * Validates a shipment tracking number (`TRK-NLNLNL`).
   */
  static isValidShipmentTrackingNumber(value: string): boolean {
    return isShipmentTrackingNumber(value);
  }

  /**
   * Validates a transaction id (`TXN-YYYYMMDD-NLNL`).
   */
  static isValidTransactionId(id: string): boolean {
    return isTransactionId(id);
  }

  /**
   * Extracts the calendar date encoded in an order number or transaction id.
   * Returns `null` when the value is not a valid identifier.
   */
  static extractTimestamp(id: string): Date | null {
    return extractIdentifierDate(id);
  }

  /**
   * Generates a batch of order numbers for bulk operations.
   */
  static generateOrderIds(count: number): string[] {
    const ids: string[] = [];
    for (let i = 0; i < count; i += 1) {
      ids.push(this.generateOrderId());
    }
    return ids;
  }
}
