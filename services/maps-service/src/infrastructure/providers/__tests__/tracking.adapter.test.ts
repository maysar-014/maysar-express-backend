import { RealTimeTrackingAdapter } from '../tracking.adapter';
import { GeoPoint } from '../../../domain/value-objects/geopoint.value-object';

describe('RealTimeTrackingAdapter', () => {
    let adapter: RealTimeTrackingAdapter;

    beforeEach(() => {
        adapter = new RealTimeTrackingAdapter();
    });

    describe('storeLocationUpdate', () => {
        it('should store location update', async () => {
            const update = {
                deliveryId: 'd1',
                courierId: 'c1',
                location: GeoPoint.create(-1.286389, 36.817223, 'Test'),
                timestamp: new Date(),
                speed: 30,
                heading: 90
            };

            await adapter.storeLocationUpdate(update);

            const location = await adapter.getCourierLocation('c1');
            expect(location).not.toBeNull();
        });
    });

    describe('getCourierLocation', () => {
        it('should return courier location', async () => {
            const update = {
                deliveryId: 'd1',
                courierId: 'c1',
                location: GeoPoint.create(-1.286389, 36.817223, 'Test'),
                timestamp: new Date(),
                speed: 30,
                heading: 90
            };

            await adapter.storeLocationUpdate(update);
            const location = await adapter.getCourierLocation('c1');

            expect(location).not.toBeNull();
        });

        it('should return null for unknown courier', async () => {
            const location = await adapter.getCourierLocation('unknown');
            expect(location).toBeNull();
        });
    });

    describe('getDeliveryTracking', () => {
        it('should return latest tracking update', async () => {
            const update = {
                deliveryId: 'd1',
                courierId: 'c1',
                location: GeoPoint.create(-1.286389, 36.817223, 'Test'),
                timestamp: new Date(),
                speed: 30,
                heading: 90
            };

            await adapter.storeLocationUpdate(update);
            const tracking = await adapter.getDeliveryTracking('d1');

            expect(tracking).not.toBeNull();
            expect(tracking?.deliveryId).toBe('d1');
        });
    });

    describe('getLocationHistory', () => {
        it('should return location history', async () => {
            const update1 = {
                deliveryId: 'd1',
                courierId: 'c1',
                location: GeoPoint.create(-1.286389, 36.817223, 'Test1'),
                timestamp: new Date(),
                speed: 30,
                heading: 90
            };

            const update2 = {
                deliveryId: 'd1',
                courierId: 'c1',
                location: GeoPoint.create(-1.289, 36.82, 'Test2'),
                timestamp: new Date(),
                speed: 35,
                heading: 90
            };

            await adapter.storeLocationUpdate(update1);
            await adapter.storeLocationUpdate(update2);

            const history = await adapter.getLocationHistory('d1');

            expect(history).toHaveLength(2);
        });
    });

    describe('calculateETA', () => {
        it('should calculate ETA', async () => {
            const location = GeoPoint.create(-1.286389, 36.817223, 'Test');
            const eta = await adapter.calculateETA('d1', location);

            expect(eta).toBeGreaterThan(0);
        });
    });

    describe('detectAnomalies', () => {
        it('should detect speed violations', async () => {
            const update = {
                deliveryId: 'd1',
                courierId: 'c1',
                location: GeoPoint.create(-1.286389, 36.817223, 'Test'),
                timestamp: new Date(),
                speed: 150,
                heading: 90
            };

            const anomalies = await adapter.detectAnomalies('d1', update);

            expect(anomalies).toContain('SPEED_VIOLATION');
        });

        it('should return empty for normal speed', async () => {
            const update = {
                deliveryId: 'd1',
                courierId: 'c1',
                location: GeoPoint.create(-1.286389, 36.817223, 'Test'),
                timestamp: new Date(),
                speed: 50,
                heading: 90
            };

            const anomalies = await adapter.detectAnomalies('d1', update);

            expect(anomalies).toHaveLength(0);
        });
    });
});
