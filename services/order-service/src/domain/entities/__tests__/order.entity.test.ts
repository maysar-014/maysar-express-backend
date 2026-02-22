import { Order, OrderStatus } from '../order.entity';
import { Address } from '../../value-objects/address.value-object';
import { Money } from '../../value-objects/money.value-object';

describe('Order Entity', () => {
    const validData = {
        id: 'order-123',
        buyerId: 'user-001',
        sellerId: 'user-002',
        items: [
            { productId: 'prod-1', quantity: 2, price: new Money(1000, 'TZS'), weight: 5 }
        ],
        totalAmount: 2000,
        currency: 'TZS',
        totalWeight: 10,
        paymentMethod: 'cod',
        deliveryAddress: {
            street: 'Main St',
            city: 'Dar es Salaam',
            postalCode: '12345',
            country: 'Tanzania',
            latitude: -6.7924,
            longitude: 39.2083
        }
    };

    describe('Creation', () => {
        it('should create a valid order', () => {
            const order = new Order(validData);

            expect(order.id).toBe(validData.id);
            expect(order.buyerId).toBe(validData.buyerId);
            expect(order.status).toBe(OrderStatus.PENDING);
            expect(order.deliveryAddress).toBeInstanceOf(Address);
            expect(order.totalAmount).toBeInstanceOf(Money);
            expect(order.totalAmount.amount).toBe(2000);
            expect(order.createdAt).toBeInstanceOf(Date);
        });

        it('should throw error when ID is missing', () => {
            const invalidData = { ...validData, id: undefined };
            expect(() => new Order(invalidData)).toThrow('Order ID must be provided');
        });

        it('should initialize with default status PENDING', () => {
            const order = new Order(validData);
            expect(order.status).toBe(OrderStatus.PENDING);
        });
    });

    describe('Status Updates', () => {
        it('should update status', () => {
            const order = new Order(validData);
            const originalUpdatedAt = order.updatedAt;

            // Wait a bit to ensure timestamp difference
            setTimeout(() => {
                order.updateStatus(OrderStatus.CONFIRMED);
                expect(order.status).toBe(OrderStatus.CONFIRMED);
                expect(order.updatedAt > originalUpdatedAt).toBe(true);
            }, 10);
        });
    });

    describe('Cancellation', () => {
        it('should be cancellable when PENDING', () => {
            const order = new Order({ ...validData, status: OrderStatus.PENDING });
            expect(order.canBeCancelled()).toBe(true);
        });

        it('should be cancellable when CONFIRMED', () => {
            const order = new Order(validData);
            order.updateStatus(OrderStatus.CONFIRMED);
            expect(order.canBeCancelled()).toBe(true);
        });

        it('should not be cancellable when SHIPPED', () => {
            const order = new Order(validData);
            order.updateStatus(OrderStatus.SHIPPED);
            expect(order.canBeCancelled()).toBe(false);
        });

        it('should not be cancellable when DELIVERED', () => {
            const order = new Order(validData);
            order.updateStatus(OrderStatus.DELIVERED);
            expect(order.canBeCancelled()).toBe(false);
        });
    });

    describe('Heavy Order Check', () => {
        it('should identify heavy order (> 20kg)', () => {
            const order = new Order({ ...validData, totalWeight: 25 });
            expect(order.isHeavyOrder()).toBe(true);
        });

        it('should identify light order (<= 20kg)', () => {
            const order = new Order({ ...validData, totalWeight: 15 });
            expect(order.isHeavyOrder()).toBe(false);
        });
    });
});
