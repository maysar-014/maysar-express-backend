import { Stock } from '../stock.entity';

describe('Stock Entity', () => {
  describe('create', () => {
    it('should create valid stock', () => {
      const stock = Stock.create({
        id: 's1',
        productVariantId: 'pv1',
        warehouseId: 'w1',
        quantity: 100,
        availableQuantity: 100,
        reservedQuantity: 0
      });
      expect(stock.getId()).toBe('s1');
      expect(stock.getQuantity()).toBe(100);
    });

    it('should reject negative quantity', () => {
      expect(() => Stock.create({
        id: 's1',
        productVariantId: 'pv1',
        warehouseId: 'w1',
        quantity: -10,
        availableQuantity: 0,
        reservedQuantity: 0
      })).toThrow('Quantity cannot be negative');
    });

    it('should reject invalid available quantity', () => {
      expect(() => Stock.create({
        id: 's1',
        productVariantId: 'pv1',
        warehouseId: 'w1',
        quantity: 100,
        availableQuantity: 150,
        reservedQuantity: 0
      })).toThrow('Available quantity cannot exceed total quantity');
    });
  });

  describe('reserve', () => {
    it('should reserve stock successfully', () => {
      const stock = Stock.create({
        id: 's1',
        productVariantId: 'pv1',
        warehouseId: 'w1',
        quantity: 100,
        availableQuantity: 100,
        reservedQuantity: 0
      });
      stock.reserve(30);
      expect(stock.getAvailableQuantity()).toBe(70);
      expect(stock.getReservedQuantity()).toBe(30);
    });

    it('should reject reservation exceeding available', () => {
      const stock = Stock.create({
        id: 's1',
        productVariantId: 'pv1',
        warehouseId: 'w1',
        quantity: 100,
        availableQuantity: 50,
        reservedQuantity: 50
      });
      expect(() => stock.reserve(60)).toThrow('Insufficient available stock');
    });
  });

  describe('release', () => {
    it('should release reserved stock', () => {
      const stock = Stock.create({
        id: 's1',
        productVariantId: 'pv1',
        warehouseId: 'w1',
        quantity: 100,
        availableQuantity: 70,
        reservedQuantity: 30
      });
      stock.release(20);
      expect(stock.getAvailableQuantity()).toBe(90);
      expect(stock.getReservedQuantity()).toBe(10);
    });
  });
});
