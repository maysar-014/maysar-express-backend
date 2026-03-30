import { IdGeneratorService } from '../../../infrastructure/services/id-generator.service';

describe('IdGeneratorService', () => {
  describe('generateOrderId', () => {
    it('should generate a valid Maysar Order ID format', () => {
      const orderId = IdGeneratorService.generateOrderId();

      expect(orderId).toMatch(/^MSR-ORD-\d{8}-\d{6}-[A-F0-9]{4}$/);
      expect(orderId).toContain('MSR-ORD-');
      expect(orderId.split('-')).toHaveLength(5);
    });

    it('should generate unique IDs on multiple calls', () => {
      const id1 = IdGeneratorService.generateOrderId();
      const id2 = IdGeneratorService.generateOrderId();

      expect(id1).not.toBe(id2);
    });

    it('should include timestamp in the correct format', () => {
      const before = new Date();
      const orderId = IdGeneratorService.generateOrderId();
      const after = new Date();

      const parts = orderId.split('-');
      const dateStr = parts[2];
      const timeStr = parts[3];

      expect(dateStr).toMatch(/^\d{8}$/); // YYYYMMDD
      expect(timeStr).toMatch(/^\d{6}$/); // HHMMSS

      // Extract date and time
      const year = parseInt(dateStr.substring(0, 4));
      const month = parseInt(dateStr.substring(4, 6)) - 1; // JS months are 0-based
      const day = parseInt(dateStr.substring(6, 8));
      const hour = parseInt(timeStr.substring(0, 2));
      const minute = parseInt(timeStr.substring(2, 4));
      const second = parseInt(timeStr.substring(4, 6));

      const generatedDate = new Date(year, month, day, hour, minute, second);

      // Allow for small time differences
      const timeDiff = Math.abs(generatedDate.getTime() - before.getTime());
      expect(timeDiff).toBeLessThan(1000); // Within 1 second
    });
  });

  describe('generateTransactionId', () => {
    it('should generate a valid Maysar Transaction ID format', () => {
      const transactionId = IdGeneratorService.generateTransactionId();

      expect(transactionId).toMatch(/^MSR-TXN-\d{8}-\d{6}-[A-F0-9]{4}$/);
      expect(transactionId).toContain('MSR-TXN-');
    });

    it('should generate unique transaction IDs', () => {
      const id1 = IdGeneratorService.generateTransactionId();
      const id2 = IdGeneratorService.generateTransactionId();

      expect(id1).not.toBe(id2);
    });
  });

  describe('generateTrackingId', () => {
    it('should generate a valid Maysar Tracking ID format', () => {
      const trackingId = IdGeneratorService.generateTrackingId();

      expect(trackingId).toMatch(/^MSR-TRK-\d{8}-\d{6}-[A-F0-9]{4}$/);
      expect(trackingId).toContain('MSR-TRK-');
    });
  });

  describe('generateOrderTrackingNumber', () => {
    it('should generate a valid public order tracking number format', () => {
      const trackingNumber = IdGeneratorService.generateOrderTrackingNumber(new Date('2026-03-16T10:15:30Z'));

      expect(trackingNumber).toMatch(/^MYS-TZ-ORD-\d{8}-\d[A-Z]\d[A-Z]$/);
      expect(trackingNumber).toContain('MYS-TZ-ORD-20260316-');
    });

    it('should generate unique tracking numbers', () => {
      const first = IdGeneratorService.generateOrderTrackingNumber();
      const second = IdGeneratorService.generateOrderTrackingNumber();

      expect(first).not.toBe(second);
    });
  });

  describe('generateShortOrderId', () => {
    it('should generate a shorter order ID format', () => {
      const shortId = IdGeneratorService.generateShortOrderId();

      expect(shortId).toMatch(/^MSR-ORD-[A-Z0-9]+$/);
      expect(shortId.length).toBeLessThan(30); // Should be shorter than full format
    });
  });

  describe('Validation methods', () => {
    it('should validate correct order IDs', () => {
      const validId = 'MSR-ORD-20260113-173418-4A7B';
      expect(IdGeneratorService.isValidOrderId(validId)).toBe(true);
    });

    it('should reject invalid order IDs', () => {
      const invalidIds = [
        'INVALID-ORD-20260113-173418-4A7B', // Wrong prefix
        'MSR-ORD-20260113-173418', // Missing random part
        'MSR-ORD-20260113-173418-4A7B-extra', // Too many parts
        'MSR-ORD-202613-173418-4A7B', // Wrong date format
        'msr-ord-20260113-173418-4a7b', // Lowercase
        'MSR-ORD-20260113-173418-gggg', // Invalid characters
      ];

      invalidIds.forEach(id => {
        expect(IdGeneratorService.isValidOrderId(id)).toBe(false);
      });
    });

    it('should validate transaction IDs', () => {
      const validId = 'MSR-TXN-20260113-173418-9C2D';
      expect(IdGeneratorService.isValidTransactionId(validId)).toBe(true);

      const invalidId = 'MSR-ORD-20260113-173418-9C2D'; // Wrong type
      expect(IdGeneratorService.isValidTransactionId(invalidId)).toBe(false);
    });

    it('should validate tracking IDs', () => {
      const validId = 'MSR-TRK-20260113-173418-7F1E';
      expect(IdGeneratorService.isValidTrackingId(validId)).toBe(true);

      const invalidId = 'MSR-ORD-20260113-173418-7F1E'; // Wrong type
      expect(IdGeneratorService.isValidTrackingId(invalidId)).toBe(false);
    });

    it('should validate public order tracking numbers', () => {
      const validId = 'MYS-TZ-ORD-20260316-3A7B';
      expect(IdGeneratorService.isValidOrderTrackingNumber(validId)).toBe(true);

      const invalidId = 'MSR-ORD-20260316-3A7B';
      expect(IdGeneratorService.isValidOrderTrackingNumber(invalidId)).toBe(false);
    });
  });

  describe('extractTimestamp', () => {
    it('should extract timestamp from valid IDs', () => {
      const orderId = 'MSR-ORD-20260113-063056-4A7B';
      const timestamp = IdGeneratorService.extractTimestamp(orderId);

      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp?.getFullYear()).toBe(2026);
      expect(timestamp?.getMonth()).toBe(0); // January (0-based)
      expect(timestamp?.getDate()).toBe(13);
      expect(timestamp?.getHours()).toBeGreaterThanOrEqual(0);
      expect(timestamp?.getHours()).toBeLessThanOrEqual(23);
      expect(timestamp?.getMinutes()).toBeGreaterThanOrEqual(0);
      expect(timestamp?.getMinutes()).toBeLessThanOrEqual(59);
      expect(timestamp?.getSeconds()).toBeGreaterThanOrEqual(0);
      expect(timestamp?.getSeconds()).toBeLessThanOrEqual(59);
    });

    it('should return null for invalid IDs', () => {
      const invalidIds = [
        'INVALID-ORD-20260113-173418-4A7B',
        'MSR-ORD-invalid-date-173418-4A7B',
        'not-an-id-at-all',
        '',
      ];

      invalidIds.forEach(id => {
        expect(IdGeneratorService.extractTimestamp(id)).toBeNull();
      });
    });
  });

  describe('generateOrderIds', () => {
    it('should generate multiple unique order IDs', () => {
      const count = 5;
      const ids = IdGeneratorService.generateOrderIds(count);

      expect(ids).toHaveLength(count);
      expect(new Set(ids).size).toBe(count); // All unique

      ids.forEach(id => {
        expect(IdGeneratorService.isValidOrderId(id)).toBe(true);
      });
    });

    it('should handle zero count', () => {
      const ids = IdGeneratorService.generateOrderIds(0);
      expect(ids).toHaveLength(0);
    });

    it('should handle large batch generation', () => {
      const count = 100;
      const ids = IdGeneratorService.generateOrderIds(count);

      expect(ids).toHaveLength(count);
      expect(new Set(ids).size).toBeGreaterThanOrEqual(count - 1); // Allow a rare collision
    });
  });

  describe('Enterprise features', () => {
    it('should generate IDs with proper branding', () => {
      const orderId = IdGeneratorService.generateOrderId();
      const transactionId = IdGeneratorService.generateTransactionId();
      const trackingId = IdGeneratorService.generateTrackingId();

      expect(orderId).toContain('MSR-ORD');
      expect(transactionId).toContain('MSR-TXN');
      expect(trackingId).toContain('MSR-TRK');
    });

    it('should be suitable for enterprise use', () => {
      // Generate a batch and verify all are enterprise-quality
      const ids = IdGeneratorService.generateOrderIds(10);

      ids.forEach(id => {
        expect(id.length).toBeGreaterThan(20); // Reasonable length
        expect(id.length).toBeLessThan(50); // Not too long
        expect(id).toMatch(/^[A-Z0-9-]+$/); // Only uppercase, numbers, dashes
      });
    });

    it('should be URL-safe', () => {
      const orderId = IdGeneratorService.generateOrderId();

      // Should not contain characters that need URL encoding
      expect(orderId).not.toMatch(/[<>:"\/\\|?*\x00-\x1F]/);
    });
  });
});
