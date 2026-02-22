import { StockPolicy } from '../stock.policy';

describe('Stock Policy', () => {
  describe('canReserve', () => {
    it('should allow reservation within available stock', () => {
      const result = StockPolicy.canReserve(100, 50, 30);
      expect(result.allowed).toBe(true);
    });

    it('should reject reservation exceeding available', () => {
      const result = StockPolicy.canReserve(100, 20, 30);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Insufficient');
    });

    it('should reject negative reservation', () => {
      const result = StockPolicy.canReserve(100, 50, -10);
      expect(result.allowed).toBe(false);
    });
  });

  describe('shouldReorder', () => {
    it('should trigger reorder at threshold', () => {
      const result = StockPolicy.shouldReorder(15, 20);
      expect(result).toBe(true);
    });

    it('should not trigger reorder above threshold', () => {
      const result = StockPolicy.shouldReorder(50, 20);
      expect(result).toBe(false);
    });
  });

  describe('calculateReorderQuantity', () => {
    it('should calculate optimal reorder quantity', () => {
      const quantity = StockPolicy.calculateReorderQuantity(10, 50, 100);
      expect(quantity).toBeGreaterThan(0);
      expect(quantity).toBeLessThanOrEqual(100);
    });
  });
});
