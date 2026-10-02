import { IdGeneratorService } from '../../../infrastructure/services/id-generator.service';

/**
 * The platform identifier contract (see shared/ids/human-readable-ids.ts):
 *
 *   Order number               ORD-YYYYMMDD-NLNL
 *   Shipment tracking number   TRK-NLNLNL      (independent per shipment)
 *   Transaction id             TXN-YYYYMMDD-NLNL
 *
 * N = digit 2-9, L = letter A-Z without I, L, O (0/1/O/I/L never appear in the
 * random parts). An order number is never a shipment tracking identifier.
 */
const ORDER_NUMBER_PATTERN = /^ORD-\d{8}-[2-9][A-HJKMNP-Z][2-9][A-HJKMNP-Z]$/;
const SHIPMENT_TRACKING_PATTERN = /^TRK-[2-9][A-HJKMNP-Z][2-9][A-HJKMNP-Z][2-9][A-HJKMNP-Z]$/;
const TRANSACTION_ID_PATTERN = /^TXN-\d{8}-[2-9][A-HJKMNP-Z][2-9][A-HJKMNP-Z]$/;

describe('IdGeneratorService', () => {
  describe('generateOrderId', () => {
    it('generates ORD-YYYYMMDD-NLNL', () => {
      const orderId = IdGeneratorService.generateOrderId(new Date(2026, 8, 27));

      expect(orderId.startsWith('ORD-20260927-')).toBe(true);
      expect(orderId).toHaveLength(17);
      expect(orderId).toMatch(ORDER_NUMBER_PATTERN);
      expect(orderId.split('-')[0]).toBe(IdGeneratorService.ORDER_PREFIX);
    });

    it('is accepted by the order-number validator for every generated value', () => {
      for (let i = 0; i < 500; i += 1) {
        const orderId = IdGeneratorService.generateOrderId();
        expect(IdGeneratorService.isValidOrderId(orderId)).toBe(true);
      }
    });

    it('uses only the human-readable alphabet in the random suffix', () => {
      for (let i = 0; i < 200; i += 1) {
        const suffix = IdGeneratorService.generateOrderId().split('-')[2];
        expect(suffix).toHaveLength(4);
        expect(suffix[0]).toMatch(/[2-9]/);
        expect(suffix[1]).toMatch(/[A-HJKMNP-Z]/);
        expect(suffix[2]).toMatch(/[2-9]/);
        expect(suffix[3]).toMatch(/[A-HJKMNP-Z]/);
      }
    });

    it('does not collide within a small batch', () => {
      const ids = new Set(IdGeneratorService.generateOrderIds(25));
      expect(ids.size).toBe(25);
    });
  });

  describe('generateShipmentTrackingNumber', () => {
    it('generates TRK-NLNLNL — short, date-free and independent of any order', () => {
      const trackingNumber = IdGeneratorService.generateShipmentTrackingNumber();

      expect(trackingNumber).toHaveLength(10);
      expect(trackingNumber.split('-')).toHaveLength(2);
      expect(trackingNumber).toMatch(SHIPMENT_TRACKING_PATTERN);
      expect(trackingNumber.startsWith(`${IdGeneratorService.SHIPMENT_TRACKING_PREFIX}-`)).toBe(true);
    });

    it('is accepted by its own validator for every generated value', () => {
      for (let i = 0; i < 500; i += 1) {
        expect(
          IdGeneratorService.isValidShipmentTrackingNumber(
            IdGeneratorService.generateShipmentTrackingNumber(),
          ),
        ).toBe(true);
      }
    });

    it('is never the order number of the order that produced it', () => {
      const orderId = IdGeneratorService.generateOrderId();
      const trackingNumber = IdGeneratorService.generateShipmentTrackingNumber();

      expect(trackingNumber).not.toBe(orderId);
      expect(IdGeneratorService.isValidOrderId(trackingNumber)).toBe(false);
      expect(IdGeneratorService.isValidShipmentTrackingNumber(orderId)).toBe(false);
    });

    it('gives every shipment of one order its own tracking number', () => {
      const orderId = IdGeneratorService.generateOrderId();
      const trackingNumbers = [
        IdGeneratorService.generateShipmentTrackingNumber(),
        IdGeneratorService.generateShipmentTrackingNumber(),
        IdGeneratorService.generateShipmentTrackingNumber(),
      ];

      expect(new Set(trackingNumbers).size).toBe(3);
      // The order number stays with the order; it is never reused as a shipment id.
      expect(trackingNumbers).not.toContain(orderId);
    });
  });

  describe('generateTransactionId', () => {
    it('follows the same timestamp contract as the order number', () => {
      const transactionId = IdGeneratorService.generateTransactionId(new Date(2026, 8, 27));

      expect(transactionId.startsWith('TXN-20260927-')).toBe(true);
      expect(transactionId).toMatch(TRANSACTION_ID_PATTERN);
      expect(IdGeneratorService.isValidTransactionId(transactionId)).toBe(true);
    });
  });

  describe('validators', () => {
    it('rejects order ids that are not exactly ORD-YYYYMMDD-NLNL', () => {
      const invalid = [
        'MSR-ORD-20260113-173418-4A7B', // retired branded format
        'ORD-20260113-1A2B', // 1 excluded from the digit alphabet
        'ORD-20260113-3A2B-EXT', // extra suffix
        'ORD-20260113-3A', // truncated suffix
        'MYS-TZ-ORD-20260316-3A7B', // tracking number is not an order number
        'TRK-3C8B2D', // tracking number
        '',
      ];

      invalid.forEach(value => {
        expect(IdGeneratorService.isValidOrderId(value)).toBe(false);
      });

      expect(IdGeneratorService.isValidOrderId('ORD-20260113-3A2B')).toBe(true);
    });

    it('rejects tracking numbers that are not exactly TRK-NLNLNL', () => {
      const invalid = [
        'TRK-3C8B2', // too short
        'TRK-3C8B2D8E', // too long
        'TRK-3I8B2D', // I excluded
        'TRK-3O8B2D', // O excluded
        'ORD-20260113-3A2B', // order number
        '',
      ];

      invalid.forEach(value => {
        expect(IdGeneratorService.isValidShipmentTrackingNumber(value)).toBe(false);
      });

      expect(IdGeneratorService.isValidShipmentTrackingNumber('TRK-3C8B2D')).toBe(true);
    });

    it('keeps the transaction namespace separate', () => {
      expect(IdGeneratorService.isValidTransactionId('TXN-20260113-3A2B')).toBe(true);
      expect(IdGeneratorService.isValidTransactionId('ORD-20260113-3A2B')).toBe(false);
    });
  });

  describe('extractTimestamp', () => {
    it('returns the calendar date encoded in an order number', () => {
      const timestamp = IdGeneratorService.extractTimestamp('ORD-20260113-3A2B');

      expect(timestamp).toBeInstanceOf(Date);
      expect([
        timestamp?.getFullYear(),
        (timestamp?.getMonth() ?? 0) + 1,
        timestamp?.getDate(),
      ]).toEqual([2026, 1, 13]);
    });

    it('returns null for invalid or non-order identifiers', () => {
      const invalid = [
        'MSR-ORD-20260113-173418-4A7B',
        'TRK-3C8B2D',
        'ORD-20261313-3A2B',
        'not-an-id-at-all',
        '',
      ];

      invalid.forEach(id => {
        expect(IdGeneratorService.extractTimestamp(id)).toBeNull();
      });
    });
  });

  describe('generateOrderIds', () => {
    it('generates multiple valid order numbers', () => {
      const ids = IdGeneratorService.generateOrderIds(10);

      expect(ids).toHaveLength(10);
      ids.forEach(id => {
        expect(id).toMatch(ORDER_NUMBER_PATTERN);
      });
    });

    it('handles zero count', () => {
      expect(IdGeneratorService.generateOrderIds(0)).toHaveLength(0);
    });
  });

  describe('single-format guarantee', () => {
    it('exposes no order-level tracking number or variant generators', () => {
      const removed = [
        'generateOrderTrackingNumber',
        'generateShortOrderId',
        'generateTrackingId',
        'isValidOrderTrackingNumber',
        'isValidTrackingId',
      ];

      removed.forEach(method => {
        expect((IdGeneratorService as unknown as Record<string, unknown>)[method]).toBeUndefined();
      });
    });

    it('emits URL-safe, uppercase identifiers in a sane length range', () => {
      const values = [
        IdGeneratorService.generateOrderId(),
        IdGeneratorService.generateTransactionId(),
        IdGeneratorService.generateShipmentTrackingNumber(),
      ];

      values.forEach(value => {
        expect(value).toMatch(/^[A-Z0-9-]+$/);
        expect(value.length).toBeGreaterThanOrEqual(10);
        expect(value.length).toBeLessThanOrEqual(24);
      });
    });
  });
});
