/**
 * Distance Calculation Algorithm Tests - HERE Routing API v8 Integration
 *
 * Constitution Section 11: Domain tests must cover pure logic only
 * Constitution Section 5: Engines, Policies, Algorithms Separation
 *
 * Tests HERE Routing API v8 integration with vehicle-specific routing,
 * traffic awareness, and real-time distance calculations
 */

import { GeoPoint } from '../../../domain/value-objects/geopoint.value-object';
import { DistanceCalculationAlgorithm, DistanceResult } from '../../../domain/algorithms/distance-calculation.algorithm';
import { RouteConstraints } from '../../../domain/engines/ports/route-optimization.port';

describe('DistanceCalculationAlgorithm - HERE Routing API v8', () => {
  // Test locations for East African logistics
  const darEsSalaam = GeoPoint.create(-6.7924, 39.2083, 'Dar es Salaam Port, Tanzania');
  const arusha = GeoPoint.create(-3.3869, 36.6828, 'Arusha, Tanzania');
  const nairobi = GeoPoint.create(-1.2864, 36.8172, 'Nairobi CBD, Kenya');
  const kampala = GeoPoint.create(0.3476, 32.5825, 'Kampala, Uganda');
  const equator = GeoPoint.create(0, 0, 'Equator Reference');
  const northPole = GeoPoint.create(90, 0, 'North Pole');
  const southPole = GeoPoint.create(-90, 0, 'South Pole');



  describe('calculateBearing', () => {
    it('should calculate correct bearing from Dar es Salaam to Arusha', () => {
      const bearing = DistanceCalculationAlgorithm.calculateBearing(darEsSalaam, arusha);

      // Arusha is northwest of Dar es Salaam, so bearing should be around 315-345 degrees
      expect(bearing).toBeGreaterThan(310);
      expect(bearing).toBeLessThan(350);
    });

    it('should return 0 for north', () => {
      const point1 = GeoPoint.create(0, 0, 'Equator');
      const point2 = GeoPoint.create(10, 0, 'North Point');
      const bearing = DistanceCalculationAlgorithm.calculateBearing(point1, point2);

      expect(bearing).toBeCloseTo(0, 1);
    });

    it('should return 90 for east', () => {
      const point1 = GeoPoint.create(0, 0, 'Prime Meridian');
      const point2 = GeoPoint.create(0, 10, 'East Point');
      const bearing = DistanceCalculationAlgorithm.calculateBearing(point1, point2);

      expect(bearing).toBeCloseTo(90, 1);
    });

    it('should return 180 for south', () => {
      const point1 = GeoPoint.create(0, 0, 'Equator');
      const point2 = GeoPoint.create(-10, 0, 'South Point');
      const bearing = DistanceCalculationAlgorithm.calculateBearing(point1, point2);

      expect(bearing).toBeCloseTo(180, 1);
    });

    it('should return 270 for west', () => {
      const point1 = GeoPoint.create(0, 0, 'Prime Meridian');
      const point2 = GeoPoint.create(0, -10, 'West Point');
      const bearing = DistanceCalculationAlgorithm.calculateBearing(point1, point2);

      expect(bearing).toBeCloseTo(270, 1);
    });

    it('should normalize bearing to 0-360 range', () => {
      // Test various bearings
      const testCases = [
        { from: GeoPoint.create(0, 179, 'Near Date Line'), to: GeoPoint.create(0, -179, 'Other Side'), expectedRange: [0, 180] },
        { from: GeoPoint.create(89, 0, 'Near North Pole'), to: GeoPoint.create(89, 180, 'Opposite'), expectedRange: [0, 360] }
      ];

      testCases.forEach(({ from, to, expectedRange }) => {
        const bearing = DistanceCalculationAlgorithm.calculateBearing(from, to);
        expect(bearing).toBeGreaterThanOrEqual(expectedRange[0]);
        expect(bearing).toBeLessThanOrEqual(expectedRange[1]);
      });
    });
  });

  describe('calculateDeliveryDistance - HERE Routing API v8', () => {
    const mockHereService = {
      calculateOptimalRoute: jest.fn()
    };

    beforeEach(() => {
      mockHereService.calculateOptimalRoute.mockClear();
    });

    it('should throw error when HERE service is not configured', async () => {
      // Clear any existing service
      DistanceCalculationAlgorithm['routeOptimizationService'] = undefined;
      const previousConfig = DistanceCalculationAlgorithm.getFallbackConfigSnapshot();
      DistanceCalculationAlgorithm.configureFallback({ enabled: false });

      await expect(DistanceCalculationAlgorithm.calculateDeliveryDistance(darEsSalaam, arusha))
        .rejects
        .toThrow('HERE Technologies service is required for distance calculations');

      DistanceCalculationAlgorithm.configureFallback(previousConfig);
    });

    it('should calculate delivery distance with traffic awareness', async () => {
      // Mock HERE Routing API v8 response with traffic data
      mockHereService.calculateOptimalRoute.mockResolvedValue({
        totalDistance: 624.5,     // Road distance in km
        totalDuration: 528,       // Duration with traffic (8.8 hours in minutes)
        baseDuration: 480,        // Duration without traffic (8 hours in minutes)
        trafficDelay: 48,         // Traffic delay (0.8 hours in minutes)
        segments: [],
        waypoints: [darEsSalaam, arusha],
        efficiency: 74,
        confidence: 0.95,
        alternatives: []
      });

      DistanceCalculationAlgorithm.setRouteOptimizationService(mockHereService as any);

      const result = await DistanceCalculationAlgorithm.calculateDeliveryDistance(darEsSalaam, arusha);

      expect(result).toHaveProperty('distance');
      expect(result).toHaveProperty('bearing');
      expect(result).toHaveProperty('duration');
      expect(result).toHaveProperty('baseDuration');
      expect(result).toHaveProperty('trafficDelay');

      expect(result.distance).toBe(624.5);     // HERE road distance
      expect(result.duration).toBe(528);       // With traffic
      expect(result.baseDuration).toBe(480);   // Without traffic
      expect(result.trafficDelay).toBe(48);    // Traffic delay
      expect(typeof result.bearing).toBe('number');
    });

    it('should handle vehicle-specific routing constraints', async () => {
      const motorcycleConstraints: RouteConstraints = {
        vehicleType: 'motorcycle',
        avoidTolls: true
      };

      mockHereService.calculateOptimalRoute.mockResolvedValue({
        totalDistance: 615.2,     // Motorcycle route might be shorter
        totalDuration: 465,       // Faster with motorcycle
        baseDuration: 420,
        trafficDelay: 45,
        segments: [],
        waypoints: [darEsSalaam, arusha],
        efficiency: 78,
        confidence: 0.92,
        alternatives: []
      });

      const result = await DistanceCalculationAlgorithm.calculateDeliveryDistance(
        darEsSalaam,
        arusha,
        30,
        motorcycleConstraints
      );

      expect(mockHereService.calculateOptimalRoute).toHaveBeenCalledWith(
        darEsSalaam,
        arusha,
        motorcycleConstraints
      );

      expect(result.distance).toBe(615.2);
      expect(result.duration).toBe(465);
      expect(result.trafficDelay).toBe(45);
    });

    it('should handle truck routing with vehicle constraints', async () => {
      const truckConstraints: RouteConstraints = {
        vehicleType: 'truck',
        avoidHighways: false
      };

      mockHereService.calculateOptimalRoute.mockResolvedValue({
        totalDistance: 645.8,     // Truck route might be longer
        totalDuration: 585,       // Slower with truck
        baseDuration: 540,
        trafficDelay: 45,
        segments: [],
        waypoints: [darEsSalaam, arusha],
        efficiency: 72,
        confidence: 0.88,
        alternatives: []
      });

      const result = await DistanceCalculationAlgorithm.calculateDeliveryDistance(
        darEsSalaam,
        arusha,
        30,
        truckConstraints
      );

      expect(result.distance).toBe(645.8);
      expect(result.duration).toBe(585);
      expect(result.baseDuration).toBe(540);
      expect(result.trafficDelay).toBe(45);
    });

    it('should round all numeric values appropriately', async () => {
      mockHereService.calculateOptimalRoute.mockResolvedValue({
        totalDistance: 624.123,
        totalDuration: 527.7,
        baseDuration: 479.5,
        trafficDelay: 48.2,
        segments: [],
        waypoints: [darEsSalaam, arusha],
        efficiency: 74,
        confidence: 0.95,
        alternatives: []
      });

      const result = await DistanceCalculationAlgorithm.calculateDeliveryDistance(darEsSalaam, arusha);

      // Distance rounded to 2 decimal places
      expect(result.distance).toBe(624.12);

      // Bearing rounded to 2 decimal places
      const bearingStr = result.bearing!.toString();
      expect(bearingStr.split('.')[1]?.length).toBeLessThanOrEqual(2);

      // Duration rounded to nearest minute
      expect(Number.isInteger(result.duration)).toBe(true);
      expect(Number.isInteger(result.baseDuration)).toBe(true);

      // Traffic delay rounded to 2 decimal places
      const trafficDelayStr = result.trafficDelay!.toString();
      expect(trafficDelayStr.split('.')[1]?.length).toBeLessThanOrEqual(2);
    });

    it('should handle zero traffic delay scenarios', async () => {
      mockHereService.calculateOptimalRoute.mockResolvedValue({
        totalDistance: 624.5,
        totalDuration: 480,       // Same as base duration
        baseDuration: 480,        // No traffic
        trafficDelay: 0,
        segments: [],
        waypoints: [darEsSalaam, arusha],
        efficiency: 85,
        confidence: 0.98,
        alternatives: []
      });

      const result = await DistanceCalculationAlgorithm.calculateDeliveryDistance(darEsSalaam, arusha);

      expect(result.duration).toBe(480);
      expect(result.baseDuration).toBe(480);
      expect(result.trafficDelay).toBe(0);
    });

    it('should handle missing optional fields gracefully', async () => {
      mockHereService.calculateOptimalRoute.mockResolvedValue({
        totalDistance: 624.5,
        totalDuration: 528,
        segments: [],
        waypoints: [darEsSalaam, arusha],
        efficiency: 74,
        confidence: 0.95,
        alternatives: []
        // baseDuration and trafficDelay are undefined
      });

      const result = await DistanceCalculationAlgorithm.calculateDeliveryDistance(darEsSalaam, arusha);

      expect(result.duration).toBe(528);
      expect(result.baseDuration).toBeUndefined();
      expect(result.trafficDelay).toBeUndefined();
    });

    it('should fall back to inflated straight-line distance when HERE fails', async () => {
      mockHereService.calculateOptimalRoute.mockRejectedValue(new Error('HERE down'));
      DistanceCalculationAlgorithm.setRouteOptimizationService(mockHereService as any);
      const previousConfig = DistanceCalculationAlgorithm.getFallbackConfigSnapshot();
      DistanceCalculationAlgorithm.configureFallback({ enabled: true, inflationFactor: 1.3 });

      const directDistance = darEsSalaam.distanceTo(arusha);
      const result = await DistanceCalculationAlgorithm.calculateDeliveryDistance(darEsSalaam, arusha);

      expect(result.distance).toBeGreaterThan(directDistance);
      expect(result.duration).toBeGreaterThan(0);
      expect(result.trafficDelay).toBe(0);

      DistanceCalculationAlgorithm.configureFallback(previousConfig);
    });
  });

  describe('isWithinRadius', () => {
    const mockHereService = {
      calculateOptimalRoute: jest.fn()
    };

    beforeEach(() => {
      mockHereService.calculateOptimalRoute.mockClear();
      DistanceCalculationAlgorithm.setRouteOptimizationService(mockHereService as any);
    });

    it('should return true for points within radius', async () => {
      const center = GeoPoint.create(0, 0, 'Center');
      const nearby = GeoPoint.create(0.1, 0.1, 'Nearby');

      mockHereService.calculateOptimalRoute.mockResolvedValue({
        totalDistance: 15.7, // Within 20km radius
        totalDuration: 20,
        segments: [],
        waypoints: [center, nearby],
        efficiency: 85,
        confidence: 0.95,
        alternatives: []
      });

      const withinRadius = await DistanceCalculationAlgorithm.isWithinRadius(center, nearby, 20);
      expect(withinRadius).toBe(true);
    });

    it('should return false for points outside radius', async () => {
      const center = GeoPoint.create(0, 0, 'Center');
      const far = GeoPoint.create(10, 10, 'Far');

      mockHereService.calculateOptimalRoute.mockResolvedValue({
        totalDistance: 1565, // Outside 100km radius
        totalDuration: 1200,
        segments: [],
        waypoints: [center, far],
        efficiency: 75,
        confidence: 0.90,
        alternatives: []
      });

      const withinRadius = await DistanceCalculationAlgorithm.isWithinRadius(center, far, 100);
      expect(withinRadius).toBe(false);
    });

    it('should return true for same point', async () => {
      const point = GeoPoint.create(0, 0, 'Point');

      mockHereService.calculateOptimalRoute.mockResolvedValue({
        totalDistance: 0, // Same point
        totalDuration: 0,
        segments: [],
        waypoints: [point, point],
        efficiency: 100,
        confidence: 1.0,
        alternatives: []
      });

      const withinRadius = await DistanceCalculationAlgorithm.isWithinRadius(point, point, 0);
      expect(withinRadius).toBe(true);
    });

    it('should handle zero radius correctly', async () => {
      const point1 = GeoPoint.create(0, 0, 'Point 1');
      const point2 = GeoPoint.create(0.001, 0.001, 'Point 2');

      mockHereService.calculateOptimalRoute
        .mockResolvedValueOnce({
          totalDistance: 0,
          totalDuration: 0,
          segments: [],
          waypoints: [point1, point1],
          efficiency: 100,
          confidence: 1.0,
          alternatives: []
        })
        .mockResolvedValueOnce({
          totalDistance: 0.2, // Small distance
          totalDuration: 1,
          segments: [],
          waypoints: [point1, point2],
          efficiency: 95,
          confidence: 0.98,
          alternatives: []
        });

      expect(await DistanceCalculationAlgorithm.isWithinRadius(point1, point1, 0)).toBe(true);
      expect(await DistanceCalculationAlgorithm.isWithinRadius(point1, point2, 0)).toBe(false);
    });
  });

  describe('calculateMidpoint', () => {
    it('should calculate midpoint between two points', () => {
      const point1 = GeoPoint.create(0, 0, 'Equator Prime');
      const point2 = GeoPoint.create(0, 10, 'East Point');

      const midpoint = DistanceCalculationAlgorithm.calculateMidpoint(point1, point2);

      expect(midpoint).toBeInstanceOf(GeoPoint);
      expect(midpoint.getLatitude()).toBeCloseTo(0, 5);
      expect(midpoint.getLongitude()).toBeCloseTo(5, 5);
      expect(midpoint.getAddress()).toContain('Midpoint');
    });

    it('should handle meridian crossing', () => {
      const london = GeoPoint.create(51.5074, -0.1278, 'London');
      const tokyo = GeoPoint.create(35.6762, 139.6503, 'Tokyo');

      const midpoint = DistanceCalculationAlgorithm.calculateMidpoint(london, tokyo);

      expect(midpoint.getLatitude()).toBeGreaterThan(40); // Should be north
      expect(midpoint.getLongitude()).toBeGreaterThan(60); // Should be east of London but west of Tokyo
      expect(midpoint.getLongitude()).toBeLessThan(140);
    });

    it('should handle polar points', () => {
      const midpoint = DistanceCalculationAlgorithm.calculateMidpoint(northPole, southPole);

      // Midpoint of north and south poles should be on equator
      expect(Math.abs(midpoint.getLatitude())).toBeLessThan(1);
    });
  });

  describe('calculateRouteDistance', () => {
    const mockHereService = {
      calculateOptimalRoute: jest.fn()
    };

    beforeEach(() => {
      mockHereService.calculateOptimalRoute.mockClear();
      DistanceCalculationAlgorithm.setRouteOptimizationService(mockHereService as any);
    });

    it('should return 0 for less than 2 waypoints', async () => {
      expect(await DistanceCalculationAlgorithm.calculateRouteDistance([darEsSalaam])).toBe(0);
      expect(await DistanceCalculationAlgorithm.calculateRouteDistance([])).toBe(0);
    });

    it('should calculate total distance for multiple waypoints', async () => {
      const waypoints = [darEsSalaam, arusha, nairobi];

      // Mock the API calls for each segment
      mockHereService.calculateOptimalRoute
        .mockResolvedValueOnce({
          totalDistance: 624.5,
          totalDuration: 528,
          segments: [],
          waypoints: [darEsSalaam, arusha],
          efficiency: 74,
          confidence: 0.95,
          alternatives: []
        })
        .mockResolvedValueOnce({
          totalDistance: 295.2,
          totalDuration: 240,
          segments: [],
          waypoints: [arusha, nairobi],
          efficiency: 78,
          confidence: 0.92,
          alternatives: []
        });

      const totalDistance = await DistanceCalculationAlgorithm.calculateRouteDistance(waypoints);
      expect(totalDistance).toBe(919.7); // 624.5 + 295.2
    });

    it('should round total distance to 2 decimal places', async () => {
      const waypoints = [darEsSalaam, arusha];

      mockHereService.calculateOptimalRoute.mockResolvedValue({
        totalDistance: 624.123,
        totalDuration: 528,
        segments: [],
        waypoints: [darEsSalaam, arusha],
        efficiency: 74,
        confidence: 0.95,
        alternatives: []
      });

      const distance = await DistanceCalculationAlgorithm.calculateRouteDistance(waypoints);
      expect(distance).toBe(624.12);
    });

    it('should handle complex routes', async () => {
      const waypoints = [
        GeoPoint.create(0, 0, 'Start'),
        GeoPoint.create(1, 1, 'Waypoint 1'),
        GeoPoint.create(2, 2, 'Waypoint 2'),
        GeoPoint.create(3, 3, 'End')
      ];

      // Mock each segment
      mockHereService.calculateOptimalRoute
        .mockResolvedValueOnce({
          totalDistance: 156.9,
          totalDuration: 120,
          segments: [],
          waypoints: [waypoints[0], waypoints[1]],
          efficiency: 80,
          confidence: 0.9,
          alternatives: []
        })
        .mockResolvedValueOnce({
          totalDistance: 156.9,
          totalDuration: 120,
          segments: [],
          waypoints: [waypoints[1], waypoints[2]],
          efficiency: 80,
          confidence: 0.9,
          alternatives: []
        })
        .mockResolvedValueOnce({
          totalDistance: 156.9,
          totalDuration: 120,
          segments: [],
          waypoints: [waypoints[2], waypoints[3]],
          efficiency: 80,
          confidence: 0.9,
          alternatives: []
        });

      const totalDistance = await DistanceCalculationAlgorithm.calculateRouteDistance(waypoints);
      expect(totalDistance).toBe(470.7); // 156.9 * 3
    });
  });

  describe('HERE API integration reliability', () => {
    const mockHereService = {
      calculateOptimalRoute: jest.fn()
    };

    beforeEach(() => {
      mockHereService.calculateOptimalRoute.mockClear();
      DistanceCalculationAlgorithm.setRouteOptimizationService(mockHereService as any);
    });

    it('should handle API responses consistently', async () => {
      mockHereService.calculateOptimalRoute.mockResolvedValue({
        totalDistance: 624.5,
        totalDuration: 528,
        baseDuration: 480,
        trafficDelay: 48,
        segments: [],
        waypoints: [darEsSalaam, arusha],
        efficiency: 74,
        confidence: 0.95,
        alternatives: []
      });

      const results: DistanceResult[] = [];

      // Run calculation multiple times
      for (let i = 0; i < 10; i++) {
        results.push(await DistanceCalculationAlgorithm.calculateDeliveryDistance(darEsSalaam, arusha));
      }

      // All results should be identical
      const firstResult = results[0];
      results.forEach(result => {
        expect(result.distance).toBe(firstResult.distance);
        expect(result.duration).toBe(firstResult.duration);
        expect(result.bearing).toBe(firstResult.bearing);
      });
    });

    it('should handle API response validation', async () => {
      mockHereService.calculateOptimalRoute.mockResolvedValue({
        totalDistance: 624.5,
        totalDuration: 528,
        segments: [],
        waypoints: [darEsSalaam, arusha],
        efficiency: 74,
        confidence: 0.95,
        alternatives: []
      });

      const result = await DistanceCalculationAlgorithm.calculateDeliveryDistance(darEsSalaam, arusha);

      // Should handle valid API responses without NaN or Infinity
      expect(result.distance).not.toBeNaN();
      expect(result.distance).not.toBe(Infinity);
      expect(result.distance).toBeGreaterThan(0);
      expect(typeof result.bearing).toBe('number');
      expect(result.bearing).not.toBeNaN();
    });
  });
});
