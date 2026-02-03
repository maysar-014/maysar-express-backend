/**
 * GeoPoint Value Object Tests
 *
 * Constitution Section 11: Domain tests must cover pure logic only
 * Constitution Section 4.1: Domain purity rule - no external dependencies
 */

import { GeoPoint } from '../../../domain/value-objects/geopoint.value-object';

describe('GeoPoint Value Object', () => {
  describe('create', () => {
    it('should create a valid GeoPoint with correct coordinates', () => {
      const lat = -6.7924;
      const lng = 39.2083;
      const address = 'Dar es Salaam, Tanzania';

      const geoPoint = GeoPoint.create(lat, lng, address);

      expect(geoPoint.getLatitude()).toBe(lat);
      expect(geoPoint.getLongitude()).toBe(lng);
      expect(geoPoint.getAddress()).toBe(address);
    });

    it('should throw error for invalid latitude', () => {
      expect(() => GeoPoint.create(91, 39.2083, 'Invalid')).toThrow('Latitude must be between -90 and 90 degrees');
      expect(() => GeoPoint.create(-91, 39.2083, 'Invalid')).toThrow('Latitude must be between -90 and 90 degrees');
    });

    it('should throw error for invalid longitude', () => {
      expect(() => GeoPoint.create(-6.7924, 181, 'Invalid')).toThrow('Longitude must be between -180 and 180 degrees');
      expect(() => GeoPoint.create(-6.7924, -181, 'Invalid')).toThrow('Longitude must be between -180 and 180 degrees');
    });

    it('should throw error for empty address', () => {
      expect(() => GeoPoint.create(-6.7924, 39.2083, '')).toThrow('Address cannot be empty');
    });
  });

  describe('distanceTo', () => {
    const darEsSalaam = GeoPoint.create(-6.7924, 39.2083, 'Dar es Salaam');
    const arusha = GeoPoint.create(-3.3869, 36.6828, 'Arusha');

    it('should calculate distance between two points using Haversine formula', () => {
      const distance = darEsSalaam.distanceTo(arusha);

      // Expected distance between Dar es Salaam and Arusha is approximately 460-480 km
      expect(distance).toBeGreaterThan(450);
      expect(distance).toBeLessThan(500);
    });

    it('should return 0 for same point', () => {
      const distance = darEsSalaam.distanceTo(darEsSalaam);
      expect(distance).toBe(0);
    });

    it('should be symmetric', () => {
      const distance1 = darEsSalaam.distanceTo(arusha);
      const distance2 = arusha.distanceTo(darEsSalaam);
      expect(distance1).toBe(distance2);
    });

    it('should handle antipodal points', () => {
      const point1 = GeoPoint.create(0, 0, 'Equator Prime');
      const point2 = GeoPoint.create(0, 180, 'Antipode');
      const distance = point1.distanceTo(point2);

      // Circumference of Earth is ~40,075 km, so antipodal distance should be ~20,037 km
      expect(distance).toBeGreaterThan(20000);
      expect(distance).toBeLessThan(21000);
    });
  });

  describe('equals', () => {
    const point1 = GeoPoint.create(-6.7924, 39.2083, 'Dar es Salaam');
    const point2 = GeoPoint.create(-6.7924, 39.2083, 'Dar es Salaam');
    const point3 = GeoPoint.create(-3.3869, 36.6828, 'Arusha');

    it('should return true for identical points', () => {
      expect(point1.equals(point2)).toBe(true);
    });

    it('should return false for different points', () => {
      expect(point1.equals(point3)).toBe(false);
    });

    it('should return true for same instance', () => {
      expect(point1.equals(point1)).toBe(true);
    });
  });

  describe('toString', () => {
    it('should return formatted string representation', () => {
      const point = GeoPoint.create(-6.7924, 39.2083, 'Dar es Salaam');
      const str = point.toString();

      expect(str).toContain('-6.7924');
      expect(str).toContain('39.2083');
      expect(str).toContain('Dar es Salaam');
    });
  });

  describe('value object immutability', () => {
    it('should be immutable - no setters exposed', () => {
      const point = GeoPoint.create(-6.7924, 39.2083, 'Dar es Salaam');

      // Should not have setters
      expect(point.getLatitude).toBeDefined(); // Getter exists
      expect((point as any).setLatitude).toBeUndefined(); // No setter
      expect((point as any).setLongitude).toBeUndefined(); // No setter
      expect((point as any).setAddress).toBeUndefined(); // No setter
    });
  });

  describe('edge cases', () => {
    it('should handle North Pole coordinates', () => {
      const northPole = GeoPoint.create(90, 0, 'North Pole');
      expect(northPole.getLatitude()).toBe(90);
      expect(northPole.getLongitude()).toBe(0);
    });

    it('should handle South Pole coordinates', () => {
      const southPole = GeoPoint.create(-90, 0, 'South Pole');
      expect(southPole.getLatitude()).toBe(-90);
      expect(southPole.getLongitude()).toBe(0);
    });

    it('should handle Prime Meridian', () => {
      const greenwich = GeoPoint.create(51.4779, 0, 'Greenwich');
      expect(greenwich.getLongitude()).toBe(0);
    });

    it('should handle International Date Line', () => {
      const dateLine = GeoPoint.create(0, 180, 'Date Line');
      expect(dateLine.getLongitude()).toBe(180);
    });
  });
});
