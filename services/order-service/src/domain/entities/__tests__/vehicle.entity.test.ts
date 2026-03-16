import { Vehicle, VehicleType, VehicleStatus } from '../vehicle.entity';
import { getModelPrefix, isSystemId, makeId } from '@shared/ids/id';

describe('Vehicle Entity', () => {
    const validData = {
        id: makeId(getModelPrefix('Logistics_Vehicle')),
        courierId: makeId(getModelPrefix('User_User')),
        type: VehicleType.MOTORCYCLE,
        licensePlate: 'MC 123 ABC'
    };

    describe('Creation', () => {
        it('should create valid vehicle with defaults', () => {
            const vehicle = new Vehicle(validData);
            expect(vehicle.id).toBe(validData.id);
            expect(vehicle.status).toBe(VehicleStatus.ACTIVE);
            expect(vehicle.totalDeliveries).toBe(0);
            expect(vehicle.capacity).toBeDefined();
            // Motorcycle defaults
            expect(vehicle.capacity.maxWeight).toBe(50);
        });

        it('should generate ID if missing', () => {
            const vehicle = new Vehicle({ ...validData, id: undefined });
            expect(isSystemId(vehicle.id)).toBe(true);
        });

        it('should set correct capacity for Car', () => {
            const vehicle = new Vehicle({ ...validData, type: VehicleType.CAR });
            expect(vehicle.capacity.maxWeight).toBe(200);
        });
    });

    describe('Capacity Check', () => {
        let vehicle: Vehicle;

        beforeEach(() => {
            vehicle = new Vehicle(validData); // Motorcycle: 50kg, 0.3m3, 10 items
        });

        it('should handle order within limits', () => {
            const result = vehicle.canHandleOrder(10, 0.1, 5);
            expect(result.canHandle).toBe(true);
        });

        it('should reject if too heavy', () => {
            const result = vehicle.canHandleOrder(60, 0.1, 5); // > 50
            expect(result.canHandle).toBe(false);
            expect(result.reason).toContain('Weight exceeds');
        });

        it('should reject if too bulky', () => {
            const result = vehicle.canHandleOrder(10, 0.5, 5); // > 0.3
            expect(result.canHandle).toBe(false);
            expect(result.reason).toContain('Volume exceeds');
        });

        it('should reject if too many items', () => {
            const result = vehicle.canHandleOrder(10, 0.1, 15); // > 10
            expect(result.canHandle).toBe(false);
            expect(result.reason).toContain('Item count exceeds');
        });

        it('should reject if vehicle inactive', () => {
            vehicle.status = VehicleStatus.MAINTENANCE;
            const result = vehicle.canHandleOrder(10, 0.1, 5);
            expect(result.canHandle).toBe(false);
            expect(result.reason).toContain('Vehicle not active');
        });
    });

    describe('Maintenance', () => {
        it('should identify need for maintenance check', () => {
            const vehicle = new Vehicle(validData);
            expect(vehicle.needsMaintenance()).toBe(false);

            vehicle.nextMaintenanceDue = new Date(Date.now() - 1000); // Past
            expect(vehicle.needsMaintenance()).toBe(true);
        });

        it('should add maintenance record and update schedule', () => {
            const vehicle = new Vehicle(validData);
            const today = new Date();
            const nextMonth = new Date();
            nextMonth.setMonth(nextMonth.getMonth() + 1);

            vehicle.addMaintenanceRecord({
                date: today,
                type: 'routine',
                description: 'Oil change',
                cost: 50000,
                nextDueDate: nextMonth
            });

            expect(vehicle.maintenanceRecords).toHaveLength(1);
            expect(vehicle.lastMaintenanceDate).toBe(today);
            expect(vehicle.nextMaintenanceDue).toBe(nextMonth);
        });
    });

    describe('Operations', () => {
        it('should update location', () => {
            const vehicle = new Vehicle(validData);
            const loc = { lat: -6.1, lng: 39.1 };
            vehicle.updateLocation(loc);
            expect(vehicle.currentLocation).toBe(loc);
        });

        it('should complete delivery and update stats', () => {
            const vehicle = new Vehicle(validData);
            vehicle.completeDelivery(15.5); // 15.5 km

            expect(vehicle.totalDeliveries).toBe(1);
            expect(vehicle.totalDistance).toBe(15.5);
        });
    });
});
