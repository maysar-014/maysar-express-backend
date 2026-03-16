import { Delivery, DeliveryStatus } from '../delivery.entity';
import { getModelPrefix, isSystemId, makeId } from '@shared/ids/id';

describe('Delivery Entity', () => {
    const validData = {
        id: makeId(getModelPrefix('Logistics_Delivery')),
        orderId: makeId(getModelPrefix('Order_Order')),
        pickupAddress: {
            street: 'Store St',
            city: 'Dar',
            region: 'Ilala'
        },
        deliveryAddress: {
            street: 'Home St',
            city: 'Dar',
            region: 'Kinondoni'
        }
    };

    describe('Creation', () => {
        it('should create valid delivery with PENDING status', () => {
            const delivery = new Delivery(validData);
            expect(delivery.id).toBe(validData.id);
            expect(delivery.status).toBe(DeliveryStatus.PENDING);
            expect(delivery.trackingNumber).toBeDefined();
            expect(delivery.trackingNumber).toMatch(/^MYS/);
            expect(delivery.retryCount).toBe(0);
        });

        it('should auto-generate ID if missing', () => {
            const delivery = new Delivery({ ...validData, id: undefined });
            expect(delivery.id).toBeDefined();
            expect(isSystemId(delivery.id)).toBe(true);
        });
    });

    describe('Courier Assignment', () => {
        it('should assign courier and update status', () => {
            const delivery = new Delivery(validData);
            const pickupTime = new Date();

            delivery.assignCourier('courier-001', pickupTime);

            expect(delivery.courierId).toBe('courier-001');
            expect(delivery.status).toBe(DeliveryStatus.ASSIGNED);
            expect(delivery.estimatedPickupTime).toBe(pickupTime);
        });
    });

    describe('Status Updates', () => {
        let delivery: Delivery;

        beforeEach(() => {
            delivery = new Delivery(validData);
        });

        it('should update to PICKED_UP and set actual time', () => {
            delivery.updateStatus(DeliveryStatus.PICKED_UP);
            expect(delivery.status).toBe(DeliveryStatus.PICKED_UP);
            expect(delivery.actualPickupTime).toBeDefined();
        });

        it('should update to DELIVERED and set actual time', () => {
            delivery.updateStatus(DeliveryStatus.DELIVERED);
            expect(delivery.status).toBe(DeliveryStatus.DELIVERED);
            expect(delivery.actualDeliveryTime).toBeDefined();
        });

        it('should increment retry count on FAILED', () => {
            expect(delivery.retryCount).toBe(0);
            delivery.updateStatus(DeliveryStatus.FAILED);
            expect(delivery.status).toBe(DeliveryStatus.FAILED);
            expect(delivery.retryCount).toBe(1);
        });
    });

    describe('Retry Logic', () => {
        it('should allow retry if count < 3', () => {
            const delivery = new Delivery(validData);
            delivery.updateStatus(DeliveryStatus.FAILED); // count = 1
            expect(delivery.canRetry()).toBe(true);

            delivery.updateStatus(DeliveryStatus.FAILED); // count = 2
            expect(delivery.canRetry()).toBe(true);
        });

        it('should not allow retry if count >= 3', () => {
            const delivery = new Delivery(validData);
            delivery.updateStatus(DeliveryStatus.FAILED);
            delivery.updateStatus(DeliveryStatus.FAILED);
            delivery.updateStatus(DeliveryStatus.FAILED); // count = 3

            expect(delivery.canRetry()).toBe(false);
        });

        it('should not allow retry if status is not FAILED', () => {
            const delivery = new Delivery(validData);
            expect(delivery.canRetry()).toBe(false);
        });
    });

    describe('Overdue Check', () => {
        it('should return false if no estimated time', () => {
            const delivery = new Delivery(validData);
            expect(delivery.isOverdue()).toBe(false);
        });

        it('should return true if past estimated time and not delivered', () => {
            const delivery = new Delivery(validData);
            delivery.estimatedDeliveryTime = new Date(Date.now() - 10000); // Past
            expect(delivery.isOverdue()).toBe(true);
        });

        it('should return false if past estimated time but already delivered', () => {
            const delivery = new Delivery(validData);
            delivery.estimatedDeliveryTime = new Date(Date.now() - 10000);
            delivery.status = DeliveryStatus.DELIVERED;
            expect(delivery.isOverdue()).toBe(false);
        });

        it('should return false if future estimated time', () => {
            const delivery = new Delivery(validData);
            delivery.estimatedDeliveryTime = new Date(Date.now() + 10000);
            expect(delivery.isOverdue()).toBe(false);
        });
    });
});
