import { DeliveryEntity } from '../../../domain/entities/delivery.entity';

describe('DeliveryEntity', () => {
    const validPickup = {
        street: 'Pickup St',
        city: 'Dar',
        region: 'Dar',
        coordinates: { lat: -6.0, lng: 39.0 },
        contactName: 'Sender',
        contactPhone: '123'
    };

    const validDelivery = {
        street: 'Drop St',
        city: 'Dar',
        region: 'Dar',
        coordinates: { lat: -6.1, lng: 39.1 },
        contactName: 'Receiver',
        contactPhone: '456'
    };

    const validPackage = {
        weight: 10,
        dimensions: { length: 1, width: 1, height: 1 },
        value: 1000,
        fragile: false,
        perishable: false,
        items: []
    };

    const createDelivery = (status: any = 'pending') => new DeliveryEntity(
        'del-1',
        'ord-1',
        validPickup,
        validDelivery,
        validPackage,
        status
    );

    describe('State Transitions', () => {
        it('should assign courier', () => {
            const delivery = createDelivery('pending');
            delivery.assignCourier('courier-1');
            expect(delivery.status).toBe('assigned');
            expect(delivery.courierId).toBe('courier-1');
            expect(delivery.timestamps.assigned).toBeDefined();
        });

        it('should throw when assigning courier if not pending', () => {
            const delivery = createDelivery('assigned');
            expect(() => delivery.assignCourier('c-2')).toThrow(/Cannot assign courier/);
        });

        it('should cycle through delivery process', () => {
            const delivery = createDelivery('pending');
            delivery.assignCourier('c-1');

            delivery.markAsPickedUp();
            expect(delivery.status).toBe('picked_up');
            expect(delivery.timestamps.pickedUp).toBeDefined();

            delivery.markAsInTransit();
            expect(delivery.status).toBe('in_transit');

            delivery.markAsOutForDelivery();
            expect(delivery.status).toBe('out_for_delivery');

            delivery.markAsDelivered();
            expect(delivery.status).toBe('delivered');
            expect(delivery.timestamps.delivered).toBeDefined();
            expect(delivery.actualDeliveryTime).toBeDefined();
        });

        it('should mark as failed', () => {
            const delivery = createDelivery('in_transit');
            delivery.markAsFailed('Accident');
            expect(delivery.status).toBe('failed');
            expect(delivery.notes).toBe('Accident');
        });

        it('should cancel delivery', () => {
            const delivery = createDelivery('pending');
            delivery.cancel('User request');
            expect(delivery.status).toBe('cancelled');
        });
    });

    describe('Business Logic', () => {
        it('should calculate duration', () => {
            const delivery = createDelivery('delivered');
            const start = new Date('2026-01-01T00:00:00.000Z');
            const end = new Date(start.getTime() + 10000);
            delivery.timestamps.assigned = start;
            delivery.timestamps.delivered = end;

            expect(delivery.getDeliveryDuration()).toBe(10000);
        });

        it('should check if on time', () => {
            const delivery = createDelivery('delivered');
            delivery.estimatedDeliveryTime = new Date(Date.now() + 10000); // Future
            delivery.actualDeliveryTime = new Date(); // Now

            expect(delivery.isOnTime()).toBe(true); // Delivered before estimated
        });

        it('should validate correctly', () => {
            const delivery = createDelivery();
            expect(delivery.validate().isValid).toBe(true);
        });

        it('should catch validation errors', () => {
            const delivery = new DeliveryEntity(
                '', // Invalid ID
                '',
                null as any,
                null as any,
                null as any,
                'pending'
            );
            const result = delivery.validate();
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });
    });
});
