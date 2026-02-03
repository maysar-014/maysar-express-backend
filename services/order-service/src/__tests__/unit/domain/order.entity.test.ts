/**
 * Order Entity Unit Tests
 * Basic testing of Order domain entity
 */

import { Order, OrderStatus } from '../../../domain/entities/order.entity';
import { Money } from '../../../domain/value-objects/money.value-object';
import { Address } from '../../../domain/value-objects/address.value-object';

describe('Order Entity', () => {
  const validAddress = new Address('123 Main St', 'Dar es Salaam', '11101', 'TZ');
  const validMoney = new Money(15000, 'TZS');

  describe('Order Creation', () => {
    it('should create a valid order with required fields', () => {
      const orderData = {
        buyerId: 'buyer_123',
        sellerId: 'seller_456',
        items: [{
          productId: 'prod_789',
          quantity: 2,
          price: validMoney,
          weight: 1.5
        }],
        totalAmount: validMoney,
        totalWeight: 3.0,
        currency: 'TZS',
        deliveryAddress: validAddress,
        paymentMethod: 'COD' as const
      };

      const order = new Order(orderData);

      expect(order.id).toBeDefined();
      expect(order.buyerId).toBe('buyer_123');
      expect(order.sellerId).toBe('seller_456');
      expect(order.status).toBe(OrderStatus.PENDING);
      expect(order.items).toHaveLength(1);
      expect(order.totalAmount.amount).toBe(15000);
      expect(order.totalAmount.currency).toBe('TZS');
    });

    it('should throw error for negative money amount', () => {
      expect(() => new Money(-100, 'TZS')).toThrow('Amount cannot be negative');
    });

    it('should throw error for empty currency', () => {
      expect(() => new Money(100, '')).toThrow('Currency is required');
    });
  });

  describe('Order Status Updates', () => {
    let order: Order;

    beforeEach(() => {
      const orderData = {
        buyerId: 'buyer_123',
        sellerId: 'seller_456',
        items: [{
          productId: 'prod_789',
          quantity: 1,
          price: validMoney,
          weight: 1.5
        }],
        totalAmount: validMoney,
        totalWeight: 1.5,
        currency: 'TZS',
        deliveryAddress: validAddress,
        paymentMethod: 'COD' as const
      };

      order = new Order(orderData);
    });

    it('should start in PENDING status', () => {
      expect(order.status).toBe(OrderStatus.PENDING);
    });

    it('should update status to CONFIRMED', () => {
      order.updateStatus(OrderStatus.CONFIRMED);
      expect(order.status).toBe(OrderStatus.CONFIRMED);
    });

    it('should update status to DELIVERED', () => {
      order.updateStatus(OrderStatus.DELIVERED);
      expect(order.status).toBe(OrderStatus.DELIVERED);
    });

    it('should update status to CANCELLED', () => {
      order.updateStatus(OrderStatus.CANCELLED);
      expect(order.status).toBe(OrderStatus.CANCELLED);
    });
  });

  describe('Order Business Logic', () => {
    it('should determine if order can be cancelled', () => {
      const orderData = {
        buyerId: 'buyer_123',
        sellerId: 'seller_456',
        items: [{
          productId: 'prod_789',
          quantity: 1,
          price: validMoney,
          weight: 1.5
        }],
        totalAmount: validMoney,
        totalWeight: 1.5,
        currency: 'TZS',
        deliveryAddress: validAddress,
        paymentMethod: 'COD' as const
      };

      const pendingOrder = new Order(orderData);
      expect(pendingOrder.canBeCancelled()).toBe(true);

      const confirmedOrder = new Order(orderData);
      confirmedOrder.updateStatus(OrderStatus.CONFIRMED);
      expect(confirmedOrder.canBeCancelled()).toBe(true);

      const deliveredOrder = new Order(orderData);
      deliveredOrder.updateStatus(OrderStatus.DELIVERED);
      expect(deliveredOrder.canBeCancelled()).toBe(false);
    });

    it('should determine if order is heavy', () => {
      const lightOrderData = {
        buyerId: 'buyer_123',
        sellerId: 'seller_456',
        items: [{
          productId: 'prod_789',
          quantity: 1,
          price: validMoney,
          weight: 1.5
        }],
        totalAmount: validMoney,
        totalWeight: 15,
        currency: 'TZS',
        deliveryAddress: validAddress,
        paymentMethod: 'COD' as const
      };

      const heavyOrderData = {
        buyerId: 'buyer_123',
        sellerId: 'seller_456',
        items: [{
          productId: 'prod_789',
          quantity: 1,
          price: validMoney,
          weight: 1.5
        }],
        totalAmount: validMoney,
        totalWeight: 25,
        currency: 'TZS',
        deliveryAddress: validAddress,
        paymentMethod: 'COD' as const
      };

      const lightOrder = new Order(lightOrderData);
      const heavyOrder = new Order(heavyOrderData);

      expect(lightOrder.isHeavyOrder()).toBe(false);
      expect(heavyOrder.isHeavyOrder()).toBe(true);
    });
  });

  describe('Value Objects', () => {
    describe('Money', () => {
      it('should create valid money object', () => {
        const money = new Money(1000, 'TZS');
        expect(money.amount).toBe(1000);
        expect(money.currency).toBe('TZS');
      });

      it('should add money correctly', () => {
        const money1 = new Money(1000, 'TZS');
        const money2 = new Money(500, 'TZS');
        const result = money1.add(money2);
        expect(result.amount).toBe(1500);
        expect(result.currency).toBe('TZS');
      });

      it('should multiply money correctly', () => {
        const money = new Money(1000, 'TZS');
        const result = money.multiply(3);
        expect(result.amount).toBe(3000);
        expect(result.currency).toBe('TZS');
      });

      it('should throw error when adding different currencies', () => {
        const money1 = new Money(1000, 'TZS');
        const money2 = new Money(500, 'USD');
        expect(() => money1.add(money2)).toThrow('Cannot add money with different currencies');
      });

      it('should compare money equality', () => {
        const money1 = new Money(1000, 'TZS');
        const money2 = new Money(1000, 'TZS');
        const money3 = new Money(500, 'TZS');

        expect(money1.equals(money2)).toBe(true);
        expect(money1.equals(money3)).toBe(false);
      });
    });

    describe('Address', () => {
      it('should create valid address object', () => {
        const address = new Address('123 Main St', 'Dar es Salaam', '11101', 'TZ');
        expect(address.street).toBe('123 Main St');
        expect(address.city).toBe('Dar es Salaam');
        expect(address.postalCode).toBe('11101');
        expect(address.country).toBe('TZ');
      });

      it('should throw error for missing fields', () => {
        expect(() => new Address('', 'Dar es Salaam', '11101', 'TZ')).toThrow('All address fields are required');
        expect(() => new Address('123 Main St', '', '11101', 'TZ')).toThrow('All address fields are required');
        expect(() => new Address('123 Main St', 'Dar es Salaam', '', 'TZ')).toThrow('All address fields are required');
        expect(() => new Address('123 Main St', 'Dar es Salaam', '11101', '')).toThrow('All address fields are required');
      });

      it('should compare address equality', () => {
        const address1 = new Address('123 Main St', 'Dar es Salaam', '11101', 'TZ');
        const address2 = new Address('123 Main St', 'Dar es Salaam', '11101', 'TZ');
        const address3 = new Address('456 Oak St', 'Dar es Salaam', '11101', 'TZ');

        expect(address1.equals(address2)).toBe(true);
        expect(address1.equals(address3)).toBe(false);
      });

      it('should convert address to string', () => {
        const address = new Address('123 Main St', 'Dar es Salaam', '11101', 'TZ');
        expect(address.toString()).toBe('123 Main St, Dar es Salaam, 11101, TZ');
      });
    });
  });
});
