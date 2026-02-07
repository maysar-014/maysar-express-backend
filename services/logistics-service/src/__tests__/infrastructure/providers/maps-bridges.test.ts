/**
 * Maps Service Bridge Adapter Tests
 *
 * Constitution Section 11: Integration tests validate service boundaries
 */

import { MapsRoutingBridge } from '../../../infrastructure/providers/maps-routing.bridge';
import { GeoPoint } from '../../../domain/value-objects/geopoint.value-object';

// Mock the Maps Registry
jest.mock('../../../../../maps-service/src/infrastructure/registry');

describe('Logistics Service - Maps Bridges', () => {
    describe('MapsRoutingBridge', () => {
        let bridge: MapsRoutingBridge;
        let mockRoutingProvider: any;

        beforeEach(() => {
            mockRoutingProvider = {
                calculateOptimalRoute: jest.fn(),
                calculateMultiStopRoute: jest.fn(),
                getRouteAlternatives: jest.fn(),
                validateRoute: jest.fn()
            };

            const { MapsRegistry } = require('../../../../../maps-service/src/infrastructure/registry');
            MapsRegistry.getInstance = jest.fn().mockReturnValue({
                getRoutingProvider: () => mockRoutingProvider
            });

            bridge = new MapsRoutingBridge();
        });

        it('should translate GeoPoint types when calculating routes', async () => {
            const origin = GeoPoint.create(-6.7924, 39.2083, 'Origin');
            const destination = GeoPoint.create(-6.8167, 39.2833, 'Destination');

            const mockRoute = {
                segments: [],
                totalDistance: 10,
                totalDuration: 20,
                waypoints: [],
                efficiency: 85,
                confidence: 0.9,
                alternatives: []
            };

            mockRoutingProvider.calculateOptimalRoute.mockResolvedValue(mockRoute);

            const result = await bridge.calculateOptimalRoute(origin, destination);

            expect(result).toEqual(mockRoute);
            expect(mockRoutingProvider.calculateOptimalRoute).toHaveBeenCalled();
        });

        it('should handle multi-stop routes', async () => {
            const waypoints = [
                GeoPoint.create(-6.7924, 39.2083, 'A'),
                GeoPoint.create(-6.8, 39.22, 'B'),
                GeoPoint.create(-6.8167, 39.2833, 'C')
            ];

            mockRoutingProvider.calculateMultiStopRoute.mockResolvedValue({} as any);

            await bridge.calculateMultiStopRoute(waypoints);

            expect(mockRoutingProvider.calculateMultiStopRoute).toHaveBeenCalled();
        });

        it('should delegate route validation', async () => {
            const route = [
                GeoPoint.create(-6.7924, 39.2083, 'A'),
                GeoPoint.create(-6.8167, 39.2833, 'B')
            ];

            mockRoutingProvider.validateRoute.mockResolvedValue({
                isValid: true,
                issues: []
            });

            const result = await bridge.validateRoute(route);

            expect(result.isValid).toBe(true);
            expect(mockRoutingProvider.validateRoute).toHaveBeenCalled();
        });
    });
});
