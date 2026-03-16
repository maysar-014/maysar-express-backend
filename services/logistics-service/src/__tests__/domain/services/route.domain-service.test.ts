/**
 * Route Domain Service Unit Tests
 * Constitution Section 6: Testing Constitution
 */

import { RouteDomainService } from '../../../domain/services/route.domain-service';
import { GeoPoint } from '../../../domain/value-objects/geopoint.value-object';
import { DeliveryEntity } from '../../../domain/entities/delivery.entity';

describe('Route Domain Service', () => {
  let routeService: RouteDomainService;

  beforeEach(() => {
    routeService = new RouteDomainService();
  });

  describe('Route Optimization', () => {
    it('should optimize route for multiple deliveries', () => {
      // Create mock deliveries
      const deliveries = [
        createMockDelivery('1', -1.2921, 36.8219, -1.2930, 36.8230),
        createMockDelivery('2', -1.2940, 36.8240, -1.2950, 36.8250)
      ];

      const startLocation = GeoPoint.create(-1.2910, 36.8200, 'Warehouse');

      const result = routeService.optimizeRoute(deliveries, startLocation);

      expect(result.id).toBeDefined();
      expect(result.stops).toHaveLength(4); // 2 pickups + 2 deliveries
      expect(result.totalDistance).toBeGreaterThan(0);
      expect(result.estimatedDuration).toBeGreaterThan(0);
      expect(result.optimizationScore).toBeGreaterThan(0);
      expect(result.startLocation).toEqual(startLocation);
    });

    it('should handle empty delivery list', () => {
      const deliveries: DeliveryEntity[] = [];
      const startLocation = GeoPoint.create(-1.2910, 36.8200, 'Warehouse');

      const result = routeService.optimizeRoute(deliveries, startLocation);

      expect(result.id).toBeDefined();
      expect(result.stops).toHaveLength(0);
      expect(result.totalDistance).toBe(0);
    });
  });

  describe('Route Validation', () => {
    it('should validate a valid route', () => {
      const deliveries = [createMockDelivery('1', -1.2921, 36.8219, -1.2930, 36.8230)];
      const startLocation = GeoPoint.create(-1.2910, 36.8200, 'Warehouse');

      const route = routeService.optimizeRoute(deliveries, startLocation);
      const validation = routeService.validateRoute(route);

      expect(validation.isValid).toBe(true);
      expect(validation.violations).toHaveLength(0);
      expect(validation.suggestions).toBeDefined();
    });

    it('should identify route violations', () => {
      const deliveries = [createMockDelivery('1', -1.2921, 36.8219, -1.2930, 36.8230)];
      const startLocation = GeoPoint.create(-1.2910, 36.8200, 'Warehouse');

      const route = routeService.optimizeRoute(deliveries, startLocation);
      const validation = routeService.validateRoute(route, {
        maxDistance: 0.1, // Very restrictive
        maxDuration: 0.01 // Very restrictive
      });

      expect(validation.isValid).toBe(false);
      expect(validation.violations.length).toBeGreaterThan(0);
      expect(validation.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Route Efficiency', () => {
    it('should calculate route efficiency metrics', () => {
      const deliveries = [
        createMockDelivery('1', -1.2921, 36.8219, -1.2930, 36.8230),
        createMockDelivery('2', -1.2940, 36.8240, -1.2950, 36.8250)
      ];

      const startLocation = GeoPoint.create(-1.2910, 36.8200, 'Warehouse');
      const route = routeService.optimizeRoute(deliveries, startLocation);

      const efficiency = routeService.calculateRouteEfficiency(route);

      expect(efficiency.distanceEfficiency).toBeGreaterThanOrEqual(0);
      expect(efficiency.distanceEfficiency).toBeLessThanOrEqual(100);
      expect(efficiency.timeEfficiency).toBeGreaterThanOrEqual(0);
      expect(efficiency.timeEfficiency).toBeLessThanOrEqual(100);
      expect(efficiency.priorityScore).toBeGreaterThanOrEqual(0);
      expect(efficiency.priorityScore).toBeLessThanOrEqual(100);
      expect(efficiency.overallEfficiency).toBeGreaterThanOrEqual(0);
      expect(efficiency.overallEfficiency).toBeLessThanOrEqual(100);
    });
  });

  describe('Route Progress Updates', () => {
    it('should update route progress', () => {
      const deliveries = [
        createMockDelivery('1', -1.2921, 36.8219, -1.2930, 36.8230),
        createMockDelivery('2', -1.2940, 36.8240, -1.2950, 36.8250)
      ];

      const startLocation = GeoPoint.create(-1.2910, 36.8200, 'Warehouse');
      const route = routeService.optimizeRoute(deliveries, startLocation);

      const currentLocation = GeoPoint.create(-1.2925, 36.8225, 'Current Location');
      const completedStops = ['1']; // Completed pickup for delivery 1

      const progress = routeService.updateRouteProgress(route, currentLocation, completedStops);

      expect(progress.updatedRoute).toBeDefined();
      expect(progress.remainingDistance).toBeGreaterThanOrEqual(0);
      expect(progress.estimatedCompletion).toBeInstanceOf(Date);
      expect(progress.nextStop).toBeDefined();
    });
  });

  describe('Alternative Routes', () => {
    it('should find alternative routes', () => {
      const deliveries = [createMockDelivery('1', -1.2921, 36.8219, -1.2930, 36.8230)];
      const startLocation = GeoPoint.create(-1.2910, 36.8200, 'Warehouse');

      const originalRoute = routeService.optimizeRoute(deliveries, startLocation);
      const alternatives = routeService.findAlternativeRoutes(originalRoute);

      expect(alternatives).toBeDefined();
      expect(Array.isArray(alternatives)).toBe(true);
      // May return empty array if no good alternatives found
      if (alternatives.length > 0) {
        alternatives.forEach(alt => {
          expect(alt.id).not.toBe(originalRoute.id);
          expect(alt.optimizationScore).toBeDefined();
        });
      }
    });

    it('should find alternatives avoiding specific locations', () => {
      const deliveries = [createMockDelivery('1', -1.2921, 36.8219, -1.2930, 36.8230)];
      const startLocation = GeoPoint.create(-1.2910, 36.8200, 'Warehouse');

      const originalRoute = routeService.optimizeRoute(deliveries, startLocation);
      const avoidLocations = [GeoPoint.create(-1.2921, 36.8219, 'Avoid Location')];

      const alternatives = routeService.findAlternativeRoutes(originalRoute, avoidLocations);

      expect(alternatives).toBeDefined();
      expect(Array.isArray(alternatives)).toBe(true);
    });
  });

  describe('Distance Calculations', () => {
    it('should calculate distances correctly', () => {
      const point1 = GeoPoint.create(0, 0, 'Point 1');
      const point2 = GeoPoint.create(0, 1, 'Point 2'); // 1 degree longitude ~ 111km at equator

      // Test internal distance calculation by creating a route
      const deliveries = [createMockDelivery('1', 0, 0, 0, 1)];
      const startLocation = GeoPoint.create(0, 0, 'Start');
      const route = routeService.optimizeRoute(deliveries, startLocation);

      expect(route.totalDistance).toBeGreaterThan(0);
    });
  });
});

// Helper function to create mock deliveries
function createMockDelivery(
  id: string,
  pickupLat: number,
  pickupLng: number,
  deliveryLat: number,
  deliveryLng: number
): DeliveryEntity {
  return {
    id,
    orderId: `order-${id}`,
    status: 'pending',
    pickupAddress: {
      street: `Pickup Street ${id}`,
      city: 'Nairobi',
      region: 'Nairobi',
      country: 'Kenya',
      coordinates: { lat: pickupLat, lng: pickupLng }
    },
    deliveryAddress: {
      street: `Delivery Street ${id}`,
      city: 'Nairobi',
      region: 'Nairobi',
      country: 'Kenya',
      coordinates: { lat: deliveryLat, lng: deliveryLng }
    },
    packageDetails: {
      weight: 5,
      dimensions: { length: 30, width: 20, height: 10 },
      description: `Package ${id}`
    },
    estimatedDeliveryTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
    createdAt: new Date(),
    updatedAt: new Date(),
    courierId: null,
    actualPickupTime: null,
    actualDeliveryTime: null,
    deliveryFee: 1000,
    priority: 'standard',
    // Add missing required properties with default values
    timestamps: {
      createdAt: new Date(),
      updatedAt: new Date(),
      estimatedDeliveryTime: new Date(Date.now() + 2 * 60 * 60 * 1000)
    },
    assignCourier: jest.fn(),
    markAsPickedUp: jest.fn(),
    markAsDelivered: jest.fn(),
    cancel: jest.fn(),
    reschedule: jest.fn(),
    calculateDistance: jest.fn(),
    calculateDeliveryFee: jest.fn(),
    validateDeliveryWindow: jest.fn(),
    canAssignCourier: jest.fn(),
    isOverdue: jest.fn(),
    getStatusHistory: jest.fn()
  } as unknown as DeliveryEntity;
}
