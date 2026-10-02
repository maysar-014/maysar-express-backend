import {
  HUMAN_ID_DIGITS,
  HUMAN_ID_LETTERS,
  ORDER_NUMBER_PATTERN,
  SHIPMENT_TRACKING_NUMBER_PATTERN,
  TRANSACTION_ID_PATTERN,
  extractIdentifierDate,
  isOrderNumber,
  isShipmentTrackingNumber,
  isTrackingLookupIdentifier,
  isTransactionId,
  makeOrderNumber,
  makeShipmentTrackingNumber,
  makeTransactionId,
  zodOrderNumber,
  zodTrackingLookupIdentifier,
} from './human-readable-ids';

describe('human-readable identifier contract', () => {
  describe('alphabets', () => {
    it('excludes the ambiguous characters 0, 1, O, I and L from random parts', () => {
      expect(HUMAN_ID_DIGITS).toBe('23456789');
      expect(HUMAN_ID_LETTERS).toHaveLength(23);
      expect(HUMAN_ID_LETTERS).not.toMatch(/[01OIL]/);
      expect(HUMAN_ID_LETTERS).toContain('Z');
    });
  });

  describe('order number ORD-YYYYMMDD-NLNL', () => {
    it('generates the documented shape for a given date', () => {
      const orderNumber = makeOrderNumber(new Date(2026, 8, 27));

      expect(orderNumber.startsWith('ORD-20260927-')).toBe(true);
      expect(orderNumber).toHaveLength(17); // ORD- + YYYYMMDD + - + NLNL
      expect(orderNumber).toMatch(ORDER_NUMBER_PATTERN);
    });

    it('round trips through its validator for 500 generations', () => {
      for (let i = 0; i < 500; i += 1) {
        const orderNumber = makeOrderNumber();
        expect(isOrderNumber(orderNumber)).toBe(true);
        expect(ORDER_NUMBER_PATTERN.test(orderNumber)).toBe(true);
      }
    });

    it('keeps the suffix an alternating digit/letter pair from the allowed alphabets', () => {
      for (let i = 0; i < 200; i += 1) {
        const [prefix, dateStamp, suffix] = makeOrderNumber().split('-');
        expect(prefix).toBe('ORD');
        expect(dateStamp).toMatch(/^\d{8}$/);
        expect(suffix).toHaveLength(4);
        expect(suffix[0]).toMatch(/[2-9]/);
        expect(suffix[1]).toMatch(/[A-HJKMNP-Z]/);
        expect(suffix[2]).toMatch(/[2-9]/);
        expect(suffix[3]).toMatch(/[A-HJKMNP-Z]/);
      }
    });

    it('rejects anything that is not exactly ORD-YYYYMMDD-NLNL', () => {
      const rejected = [
        'ORD-20260927-1A2B', // 1 is excluded from the digit alphabet
        'ORD-20260927-0A2B', // 0 is excluded
        'ORD-20260927-3I2B', // I is excluded
        'ORD-20260927-3L2B', // L is excluded
        'ORD-20260927-3O2B', // O is excluded
        'ORD-20260927-3A2', // truncated suffix
        'ORD-20260927-3A2B2C', // suffix longer than NLNL
        'ORD-20260927-3A2BX', // one extra character
        'ORD-20260927-3A2B-EXT', // extra suffix segment
        'ORD-2026-09-27-3A2B', // dashed calendar part
        'OR-20260927-3A2B', // wrong prefix
        'ord-20260927-3A2B', // lowercase prefix
        'MSR-ORD-20260927-3A2B', // the legacy branded prefix is not an order number
        'ORD-20260927-3A2B ', // trailing whitespace
        ' ORD-20260927-3A2B', // leading whitespace
        '', // empty
      ];

      rejected.forEach(value => {
        expect(isOrderNumber(value)).toBe(false);
        expect(ORDER_NUMBER_PATTERN.test(value)).toBe(false);
      });
    });
  });

  describe('shipment tracking number TRK-NLNLNL', () => {
    it('generates a short, date-free, independent identifier', () => {
      const trackingNumber = makeShipmentTrackingNumber();

      expect(trackingNumber.startsWith('TRK-')).toBe(true);
      expect(trackingNumber).toHaveLength(10); // TRK- + NLNLNL
      expect(trackingNumber.split('-')).toHaveLength(2);
      expect(trackingNumber).toMatch(SHIPMENT_TRACKING_NUMBER_PATTERN);
    });

    it('round trips through its validator for 500 generations', () => {
      for (let i = 0; i < 500; i += 1) {
        const trackingNumber = makeShipmentTrackingNumber();
        expect(isShipmentTrackingNumber(trackingNumber)).toBe(true);
      }
    });

    it('rejects malformed tracking numbers', () => {
      const rejected = [
        'TRK-3C8B2', // too short
        'TRK-3C8B2D8E', // too long
        'TRK-1C8B2D', // 1 excluded
        'TRK-3I8B2D', // I excluded
        'TRK-3L8B2D', // L excluded
        'TRK-3O8B2D', // O excluded
        'TRK-3C8B2D-EXT', // extra suffix
        'TRK-20260927-3C8B', // date is not part of a tracking number
        'trk-3C8B2D', // lowercase prefix
      ];

      rejected.forEach(value => {
        expect(isShipmentTrackingNumber(value)).toBe(false);
      });
    });
  });

  describe('order vs shipment separation', () => {
    it('never accepts an order number as a shipment tracking number or vice versa', () => {
      const orderNumber = makeOrderNumber();
      const trackingNumber = makeShipmentTrackingNumber();

      expect(isShipmentTrackingNumber(orderNumber)).toBe(false);
      expect(isOrderNumber(trackingNumber)).toBe(false);
    });

    it('accepts either namespace for the tracking lookup', () => {
      expect(isTrackingLookupIdentifier(makeOrderNumber())).toBe(true);
      expect(isTrackingLookupIdentifier(makeShipmentTrackingNumber())).toBe(true);
      expect(isTrackingLookupIdentifier('MSR-ORD-20260927-085312-1DEF')).toBe(false);
      expect(isTrackingLookupIdentifier('del-1')).toBe(false);
      expect(isTrackingLookupIdentifier(undefined)).toBe(false);
    });

    it('issues independent tracking numbers for the shipments of one order', () => {
      const trackingNumbers = new Set(
        Array.from({ length: 100 }, () => makeShipmentTrackingNumber()),
      );

      // The format holds ~6.2M values, so a handful of collisions is possible but
      // the space must not be systemically re-used.
      expect(trackingNumbers.size).toBeGreaterThan(90);
    });
  });

  describe('transaction id and encoded date', () => {
    it('follows the same timestamp shape as an order number', () => {
      const transactionId = makeTransactionId(new Date(2026, 8, 27));

      expect(transactionId.startsWith('TXN-20260927-')).toBe(true);
      expect(transactionId).toMatch(TRANSACTION_ID_PATTERN);
      expect(isTransactionId(transactionId)).toBe(true);
    });

    it('extracts the calendar date encoded in an order number', () => {
      const extracted = extractIdentifierDate('ORD-20260927-3C8B');

      expect(extracted).not.toBeNull();
      expect([
        extracted?.getFullYear(),
        (extracted?.getMonth() ?? 0) + 1,
        extracted?.getDate(),
      ]).toEqual([2026, 9, 27]);
    });

    it('returns null for tracking numbers, impossible dates and non-string input', () => {
      expect(extractIdentifierDate('TRK-3C8B2D')).toBeNull();
      expect(extractIdentifierDate('ORD-20261327-3C8B')).toBeNull(); // month 13
      expect(extractIdentifierDate('ORD-20260230-3C8B')).toBeNull(); // 30 February
      expect(extractIdentifierDate(null)).toBeNull();
    });
  });

  describe('request validators', () => {
    it('accepts generated order numbers and rejects malformed ones', () => {
      expect(zodOrderNumber().safeParse(makeOrderNumber()).success).toBe(true);
      expect(zodOrderNumber().safeParse('ORD-20260927-1A2B').success).toBe(false);
    });

    it('accepts both namespaces for the tracking lookup', () => {
      expect(zodTrackingLookupIdentifier().safeParse(makeOrderNumber()).success).toBe(true);
      expect(zodTrackingLookupIdentifier().safeParse(makeShipmentTrackingNumber()).success).toBe(true);
      expect(zodTrackingLookupIdentifier().safeParse('MSR-ORD-20260927-085312-1DEF').success).toBe(
        false,
      );
    });
  });
});

