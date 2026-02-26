import { SessionPolicy } from '../session.policy';

describe('SessionPolicy', () => {
  describe('shouldExpire', () => {
    it('should expire old sessions', () => {
      const result = SessionPolicy.shouldExpire(
        new Date(Date.now() - 7200000),
        3600000
      );
      expect(result).toBe(true);
    });

    it('should keep active sessions', () => {
      const result = SessionPolicy.shouldExpire(
        new Date(Date.now() - 1000),
        3600000
      );
      expect(result).toBe(false);
    });
  });

  describe('calculateExpiry', () => {
    it('should calculate correct expiry', () => {
      const expiry = SessionPolicy.calculateExpiry(3600000);
      expect(expiry.getTime()).toBeGreaterThan(Date.now());
    });
  });
});
