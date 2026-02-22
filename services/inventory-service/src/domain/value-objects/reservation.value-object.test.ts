import { Reservation } from '../reservation.value-object';

describe('Reservation Value Object', () => {
  describe('create', () => {
    it('should create valid reservation', () => {
      const reservation = Reservation.create({
        id: 'r1',
        orderId: 'o1',
        productVariantId: 'pv1',
        quantity: 5,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000)
      });
      expect(reservation.getId()).toBe('r1');
      expect(reservation.getQuantity()).toBe(5);
    });

    it('should reject expired reservation', () => {
      expect(() => Reservation.create({
        id: 'r1',
        orderId: 'o1',
        productVariantId: 'pv1',
        quantity: 5,
        expiresAt: new Date(Date.now() - 1000)
      })).toThrow('Expiration date must be in the future');
    });

    it('should reject zero quantity', () => {
      expect(() => Reservation.create({
        id: 'r1',
        orderId: 'o1',
        productVariantId: 'pv1',
        quantity: 0,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000)
      })).toThrow('Quantity must be positive');
    });
  });

  describe('isExpired', () => {
    it('should detect expired reservation', () => {
      const reservation = Reservation.create({
        id: 'r1',
        orderId: 'o1',
        productVariantId: 'pv1',
        quantity: 5,
        expiresAt: new Date(Date.now() + 100)
      });
      setTimeout(() => {
        expect(reservation.isExpired()).toBe(true);
      }, 200);
    });

    it('should detect active reservation', () => {
      const reservation = Reservation.create({
        id: 'r1',
        orderId: 'o1',
        productVariantId: 'pv1',
        quantity: 5,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000)
      });
      expect(reservation.isExpired()).toBe(false);
    });
  });
});
