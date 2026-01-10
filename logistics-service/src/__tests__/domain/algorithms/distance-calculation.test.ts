/**
 * Distance Calculation Algorithm Tests
 *
 * Constitution Section 11: Domain tests must cover pure logic only
 * Constitution Section 5: Engines, Policies, Algorithms Separation
 */

import { GeoPoint } from '../../../domain/value-objects/geopoint.value-object';
import { DistanceCalculationAlgorithm, DistanceResult } from '../../../domain/algorithms/distance-calculation.algorithm';

describe('DistanceCalculationAlgorithm', () => {
  // Test locations
  const darEsSalaam = GeoPoint.create(-6.7924, 39.2083, 'Dar es Salaam, Tanzania');
  const arusha = GeoPoint.create(-3.3869, 36.6828, 'Arusha, Tanzania');
  const nairobi = GeoPoint.create(-1.2864, 36.8172, 'Nairobi, Kenya');
  const kampala = GeoPoint.create(0.3476, 32.5825, 'Kampala, Uganda');
  const equator = GeoPoint.create(0, 0, 'Equator Prime');
  const northPole = GeoPoint.create(90, 0, 'North Pole');
  const southPole = GeoPoint.create(-90, 0, 'South Pole');

  describe('calculateHaversineDistance', () => {
    it('should calculate accurate distance between Dar es Salaam and Arusha', () => {
      const distance = DistanceCalculationAlgorithm.calculateHaversineDistance(darEsSalaam, arusha);

      // Expected distance: ~460-480 km
      expect(distance).toBeGreaterThan(450);
      expect(distance).toBeLessThan(490);
      expect(distance).toBeCloseTo(470, 0); // Approximately 470km
    });

    it('should calculate distance between specific coordinates (-6.7813260058560365, 39.03496860459133) to (-3.366479861310482, 36.682537148684055) using HERE Technologies', () => {
      const point1 = GeoPoint.create(-6.7813260058560365, 39.03496860459133, 'Point 1');
      const point2 = GeoPoint.create(-3.366479861310482, 36.682537148684055, 'Point 2');

      // Test Haversine for reference (straight line distance)
      const haversineDistance = DistanceCalculationAlgorithm.calculateHaversineDistance(point1, point2);
      expect(haversineDistance).toBeCloseTo(460.49, 1); // Haversine: 460.49 km

      // NOTE: HERE Technologies would return ~624 km (actual road distance via B1/A14)
      // Test validates Haversine calculation for reference
    });

    it('should return 0 for same point', () => {
      const distance = DistanceCalculationAlgorithm.calculateHaversineDistance(darEsSalaam, darEsSalaam);
      expect(distance).toBe(0);
    });

    it('should be symmetric', () => {
      const distance1 = DistanceCalculationAlgorithm.calculateHaversineDistance(darEsSalaam, arusha);
      const distance2 = DistanceCalculationAlgorithm.calculateHaversineDistance(arusha, darEsSalaam);
      expect(distance1).toBe(distance2);
    });

    it('should handle antipodal points', () => {
      const distance = DistanceCalculationAlgorithm.calculateHaversineDistance(northPole, southPole);

      // Earth's circumference is ~40,075 km, so antipodal distance should be ~20,037 km
      expect(distance).toBeGreaterThan(20000);
      expect(distance).toBeLessThan(20100);
    });

    it('should calculate equatorial distances accurately', () => {
      const distance = DistanceCalculationAlgorithm.calculateHaversineDistance(equator, kampala);

      // Kampala is at 0°N, 32.5825°E, so distance should be approximately 3,615 km
      expect(distance).toBeGreaterThan(3600);
      expect(distance).toBeLessThan(3650);
    });
  });

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

  describe('calculateDeliveryDistance', () => {
    it('should throw error when HERE service is not configured', async () => {
      // Clear any existing service
      DistanceCalculationAlgorithm['routeOptimizationService'] = undefined;

      await expect(DistanceCalculationAlgorithm.calculateDeliveryDistance(darEsSalaam, arusha))
        .rejects
        .toThrow('HERE Technologies service is required for distance calculations');
    });

    it('should calculate complete delivery distance with HERE Technologies', async () => {
      // Mock HERE Technologies service for testing
      const mockHereService = {
        calculateOptimalRoute: jest.fn().mockResolvedValue({
          totalDistance: 624.0, // Google Maps distance via B1/A14
          totalDuration: 480,   // 8 hours in minutes
          segments: [],
          waypoints: [darEsSalaam, arusha],
          efficiency: 74,
          confidence: 0.95,
          alternatives: []
        })
      };

      DistanceCalculationAlgorithm.setRouteOptimizationService(mockHereService as any);

      const result = await DistanceCalculationAlgorithm.calculateDeliveryDistance(darEsSalaam, arusha);

      expect(result).toHaveProperty('distance');
      expect(result).toHaveProperty('bearing');
      expect(result).toHaveProperty('duration');

      expect(result.distance).toBe(624.0); // HERE Technologies road distance
      expect(result.duration).toBe(480);   // 8 hours in minutes
      expect(typeof result.bearing).toBe('number');
    });

    it('should calculate duration based on custom speed', async () => {
      const customSpeed = 50; // km/h
      const result = await DistanceCalculationAlgorithm.calculateDeliveryDistance(darEsSalaam, arusha, customSpeed);

      // Duration should be distance / speed * 60 (convert hours to minutes)
      const expectedDuration = Math.round((result.distance / customSpeed) * 60);
      expect(result.duration).toBe(expectedDuration);
    });

    it('should round distance and bearing to 2 decimal places', async () => {
      const result = await DistanceCalculationAlgorithm.calculateDeliveryDistance(darEsSalaam, arusha);

      // Check if values are rounded to 2 decimal places
      const distanceStr = result.distance.toString();
      const bearingStr = result.bearing!.toString();

      expect(distanceStr.split('.')[1]?.length).toBeLessThanOrEqual(2);
      expect(bearingStr.split('.')[1]?.length).toBeLessThanOrEqual(2);
    });

    it('should round duration to nearest minute', async () => {
      const result = await DistanceCalculationAlgorithm.calculateDeliveryDistance(darEsSalaam, arusha);
      expect(Number.isInteger(result.duration)).toBe(true);
    });
  });

  describe('isWithinRadius', () => {
    it('should return true for points within radius', () => {
      const center = GeoPoint.create(0, 0, 'Center');
      const nearby = GeoPoint.create(0.1, 0.1, 'Nearby'); // ~15.7 km away

      const withinRadius = DistanceCalculationAlgorithm.isWithinRadius(center, nearby, 20);
      expect(withinRadius).toBe(true);
    });

    it('should return false for points outside radius', () => {
      const center = GeoPoint.create(0, 0, 'Center');
      const far = GeoPoint.create(10, 10, 'Far'); // ~1565 km away

      const withinRadius = DistanceCalculationAlgorithm.isWithinRadius(center, far, 100);
      expect(withinRadius).toBe(false);
    });

    it('should return true for same point', () => {
      const point = GeoPoint.create(0, 0, 'Point');
      const withinRadius = DistanceCalculationAlgorithm.isWithinRadius(point, point, 0);
      expect(withinRadius).toBe(true);
    });

    it('should handle zero radius correctly', () => {
      const point1 = GeoPoint.create(0, 0, 'Point 1');
      const point2 = GeoPoint.create(0.001, 0.001, 'Point 2'); // Very close

      expect(DistanceCalculationAlgorithm.isWithinRadius(point1, point1, 0)).toBe(true);
      expect(DistanceCalculationAlgorithm.isWithinRadius(point1, point2, 0)).toBe(false);
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
    it('should return 0 for less than 2 waypoints', () => {
      expect(DistanceCalculationAlgorithm.calculateRouteDistance([darEsSalaam])).toBe(0);
      expect(DistanceCalculationAlgorithm.calculateRouteDistance([])).toBe(0);
    });

    it('should calculate total distance for multiple waypoints', () => {
      const waypoints = [darEsSalaam, arusha, nairobi];
      const totalDistance = DistanceCalculationAlgorithm.calculateRouteDistance(waypoints);

      // Should be sum of individual distances
      const dist1 = DistanceCalculationAlgorithm.calculateHaversineDistance(darEsSalaam, arusha);
      const dist2 = DistanceCalculationAlgorithm.calculateHaversineDistance(arusha, nairobi);
      const expectedTotal = dist1 + dist2;

      expect(totalDistance).toBeCloseTo(expectedTotal, 1);
    });

    it('should round total distance to 2 decimal places', () => {
      const waypoints = [darEsSalaam, arusha];
      const distance = DistanceCalculationAlgorithm.calculateRouteDistance(waypoints);

      const distanceStr = distance.toString();
      const decimalPlaces = distanceStr.split('.')[1]?.length || 0;
      expect(decimalPlaces).toBeLessThanOrEqual(2);
    });

    it('should handle complex routes', () => {
      const waypoints = [
        GeoPoint.create(0, 0, 'Start'),
        GeoPoint.create(1, 1, 'Waypoint 1'),
        GeoPoint.create(2, 2, 'Waypoint 2'),
        GeoPoint.create(3, 3, 'End')
      ];

      const totalDistance = DistanceCalculationAlgorithm.calculateRouteDistance(waypoints);
      expect(totalDistance).toBeGreaterThan(0);

      // Should be sum of all segments
      let expectedTotal = 0;
      for (let i = 0; i < waypoints.length - 1; i++) {
        expectedTotal += DistanceCalculationAlgorithm.calculateHaversineDistance(waypoints[i], waypoints[i + 1]);
      }

      expect(totalDistance).toBeCloseTo(expectedTotal, 1);
    });
  });

  describe('algorithm accuracy and edge cases', () => {
    it('should handle very close points', () => {
      const point1 = GeoPoint.create(0, 0, 'Point 1');
      const point2 = GeoPoint.create(0.0001, 0.0001, 'Point 2'); // ~15.7 meters apart

      const distance = DistanceCalculationAlgorithm.calculateHaversineDistance(point1, point2);
      expect(distance).toBeGreaterThan(0.01); // At least 10 meters
      expect(distance).toBeLessThan(0.1); // Less than 100 meters
    });

    it('should handle exact coordinate matches', () => {
      const point1 = GeoPoint.create(45.0, 90.0, 'Test Point');
      const point2 = GeoPoint.create(45.0, 90.0, 'Same Point');

      expect(DistanceCalculationAlgorithm.calculateHaversineDistance(point1, point2)).toBe(0);
      expect(DistanceCalculationAlgorithm.calculateBearing(point1, point2)).toBe(0); // Default for same point
    });

    it('should handle international date line crossing', () => {
      const point1 = GeoPoint.create(0, 179, 'Near Date Line West');
      const point2 = GeoPoint.create(0, -179, 'Near Date Line East');

      const distance = DistanceCalculationAlgorithm.calculateHaversineDistance(point1, point2);
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(500); // Should be small distance across date line
    });

    it('should maintain precision for long distances', async () => {
      const distance = DistanceCalculationAlgorithm.calculateHaversineDistance(northPole, southPole);
      const deliveryResult = await DistanceCalculationAlgorithm.calculateDeliveryDistance(northPole, southPole);

      expect(deliveryResult.distance).toBeCloseTo(distance, 1);
    });
  });

  describe('performance and computational stability', () => {
    it('should handle repeated calculations consistently', () => {
      const results: number[] = [];

      // Run calculation multiple times
      for (let i = 0; i < 10; i++) {
        results.push(DistanceCalculationAlgorithm.calculateHaversineDistance(darEsSalaam, arusha));
      }

      // All results should be identical
      const firstResult = results[0];
      results.forEach(result => {
        expect(result).toBe(firstResult);
      });
    });

    it('should not have floating point precision issues for normal distances', () => {
      const distance = DistanceCalculationAlgorithm.calculateHaversineDistance(darEsSalaam, arusha);

      // Should not be NaN or Infinity
      expect(distance).not.toBeNaN();
      expect(distance).not.toBe(Infinity);
      expect(distance).toBeGreaterThan(0);
    });
  });
});
