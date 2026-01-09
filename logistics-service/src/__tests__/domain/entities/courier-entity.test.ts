/**
 * Courier Entity Tests
 *
 * Constitution Section 11: Domain tests must cover pure logic only
 * Constitution Section 3: Business logic protection - entities contain core business rules
 */

import { CourierEntity } from '../../../domain/entities/courier.entity';
import { GeoPoint } from '../../../domain/value-objects/geopoint.value-object';

describe('CourierEntity', () => {
  // Test data
  const validGeoPoint = GeoPoint.create(-6.7924, 39.2083, 'Dar es Salaam');

  const validCourierData = {
    id: 'courier-123',
    name: 'John Doe',
    phone: '+255 712 345 678',
    vehicle: {
      type: 'motorcycle',
      capacity: {
        maxWeight: 20,
        maxVolume: 0.5,
        maxItems: 5
      }
    },
    rating: 4.8,
    completionRate: 0.97,
    currentLocation: validGeoPoint,
    isAvailable: true,
    estimatedArrivalTime: 15,
    trafficExperience: 0.85
  };

  describe('create', () => {
    it('should create a valid CourierEntity with complete data', () => {
      const courier = CourierEntity.create(validCourierData);

      expect(courier).toBeInstanceOf(CourierEntity);
      expect(courier.id).toBe(validCourierData.id);
      expect(courier.name).toBe(validCourierData.name);
      expect(courier.phone).toBe(validCourierData.phone);
      expect(courier.rating).toBe(validCourierData.rating);
      expect(courier.completionRate).toBe(validCourierData.completionRate);
      expect(courier.isAvailable).toBe(validCourierData.isAvailable);
      expect(courier.estimatedArrivalTime).toBe(validCourierData.estimatedArrivalTime);
      expect(courier.trafficExperience).toBe(validCourierData.trafficExperience);
    });

    it('should handle different vehicle types', () => {
      const vehicleTypes = ['bicycle', 'motorcycle', 'car', 'truck'];

      vehicleTypes.forEach(type => {
        const data = {
          ...validCourierData,
          vehicle: {
            ...validCourierData.vehicle,
            type
          }
        };
        const courier = CourierEntity.create(data);
        expect(courier.vehicle.type).toBe(type);
      });
    });

    it('should handle edge case ratings', () => {
      const testCases = [
        { rating: 1.0, expected: 1.0 },
        { rating: 5.0, expected: 5.0 },
        { rating: 2.5, expected: 2.5 }
      ];

      testCases.forEach(({ rating, expected }) => {
        const data = { ...validCourierData, rating };
        const courier = CourierEntity.create(data);
        expect(courier.rating).toBe(expected);
      });
    });
  });

  describe('isEligibleForAssignment', () => {
    it('should return true for eligible courier', () => {
      const courier = CourierEntity.create(validCourierData);
      expect(courier.isEligibleForAssignment()).toBe(true);
    });

    it('should return false for unavailable courier', () => {
      const data = { ...validCourierData, isAvailable: false };
      const courier = CourierEntity.create(data);
      expect(courier.isEligibleForAssignment()).toBe(false);
    });

    it('should return false for low rating courier', () => {
      const data = { ...validCourierData, rating: 3.5 };
      const courier = CourierEntity.create(data);
      expect(courier.isEligibleForAssignment()).toBe(false);
    });

    it('should return false for low completion rate courier', () => {
      const data = { ...validCourierData, completionRate: 0.90 };
      const courier = CourierEntity.create(data);
      expect(courier.isEligibleForAssignment()).toBe(false);
    });

    it('should return true for boundary rating (4.0)', () => {
      const data = { ...validCourierData, rating: 4.0 };
      const courier = CourierEntity.create(data);
      expect(courier.isEligibleForAssignment()).toBe(true);
    });

    it('should return true for boundary completion rate (0.95)', () => {
      const data = { ...validCourierData, completionRate: 0.95 };
      const courier = CourierEntity.create(data);
      expect(courier.isEligibleForAssignment()).toBe(true);
    });
  });

  describe('canHandleWeight', () => {
    it('should return true for weight within capacity', () => {
      const courier = CourierEntity.create(validCourierData);
      expect(courier.canHandleWeight(15)).toBe(true);
      expect(courier.canHandleWeight(20)).toBe(true); // Exact capacity
    });

    it('should return false for weight exceeding capacity', () => {
      const courier = CourierEntity.create(validCourierData);
      expect(courier.canHandleWeight(25)).toBe(false);
      expect(courier.canHandleWeight(21)).toBe(false);
    });

    it('should return true for zero weight', () => {
      const courier = CourierEntity.create(validCourierData);
      expect(courier.canHandleWeight(0)).toBe(true);
    });

    it('should handle different vehicle capacities', () => {
      const largeVehicleData = {
        ...validCourierData,
        vehicle: {
          ...validCourierData.vehicle,
          capacity: { maxWeight: 1000, maxVolume: 10, maxItems: 50 }
        }
      };
      const largeCourier = CourierEntity.create(largeVehicleData);
      expect(largeCourier.canHandleWeight(500)).toBe(true);
      expect(largeCourier.canHandleWeight(1500)).toBe(false);
    });
  });

  describe('canHandleVolume', () => {
    it('should return true for volume within capacity', () => {
      const courier = CourierEntity.create(validCourierData);
      expect(courier.canHandleVolume(0.3)).toBe(true);
      expect(courier.canHandleVolume(0.5)).toBe(true); // Exact capacity
    });

    it('should return false for volume exceeding capacity', () => {
      const courier = CourierEntity.create(validCourierData);
      expect(courier.canHandleVolume(0.6)).toBe(false);
      expect(courier.canHandleVolume(1.0)).toBe(false);
    });

    it('should return true for zero volume', () => {
      const courier = CourierEntity.create(validCourierData);
      expect(courier.canHandleVolume(0)).toBe(true);
    });
  });

  describe('getDistanceFrom', () => {
    const courier = CourierEntity.create(validCourierData);
    const nearbyPoint = GeoPoint.create(-6.8, 39.2, 'Nearby');
    const farPoint = GeoPoint.create(-7.0, 39.0, 'Far');

    it('should calculate distance to another location', () => {
      const distance = courier.getDistanceFrom(nearbyPoint);
      expect(distance).toBeGreaterThan(0);
      expect(typeof distance).toBe('number');
      expect(distance).not.toBeNaN();
    });

    it('should return 0 for same location', () => {
      const distance = courier.getDistanceFrom(validGeoPoint);
      expect(distance).toBe(0);
    });

    it('should be symmetric', () => {
      const distance1 = courier.getDistanceFrom(nearbyPoint);
      // Create another courier at nearby point
      const nearbyCourierData = {
        ...validCourierData,
        currentLocation: nearbyPoint
      };
      const nearbyCourier = CourierEntity.create(nearbyCourierData);
      const distance2 = nearbyCourier.getDistanceFrom(validGeoPoint);

      expect(distance1).toBe(distance2);
    });
  });

  describe('toString', () => {
    it('should return formatted string with name, vehicle type, and rating', () => {
      const courier = CourierEntity.create(validCourierData);
      const str = courier.toString();

      expect(str).toContain('John Doe');
      expect(str).toContain('motorcycle');
      expect(str).toContain('4.8');
    });

    it('should handle different vehicle types', () => {
      const carData = {
        ...validCourierData,
        vehicle: { ...validCourierData.vehicle, type: 'car' },
        name: 'Jane Smith'
      };
      const carCourier = CourierEntity.create(carData);
      const str = carCourier.toString();

      expect(str).toContain('Jane Smith');
      expect(str).toContain('car');
    });

    it('should handle decimal ratings', () => {
      const preciseData = {
        ...validCourierData,
        rating: 4.25
      };
      const courier = CourierEntity.create(preciseData);
      const str = courier.toString();

      expect(str).toContain('4.25');
    });
  });

  describe('business invariants', () => {
    it('should maintain immutability - no setters exposed', () => {
      const courier = CourierEntity.create(validCourierData);

      // Should not have setters
      expect((courier as any).setId).toBeUndefined();
      expect((courier as any).setName).toBeUndefined();
      expect((courier as any).setRating).toBeUndefined();
      expect((courier as any).setAvailable).toBeUndefined();
    });

    it('should handle all required properties', () => {
      const courier = CourierEntity.create(validCourierData);

      // Verify all properties are accessible
      expect(courier.id).toBeDefined();
      expect(courier.name).toBeDefined();
      expect(courier.phone).toBeDefined();
      expect(courier.vehicle).toBeDefined();
      expect(courier.rating).toBeDefined();
      expect(courier.completionRate).toBeDefined();
      expect(courier.currentLocation).toBeDefined();
      expect(courier.isAvailable).toBeDefined();
      expect(courier.estimatedArrivalTime).toBeDefined();
      expect(courier.trafficExperience).toBeDefined();
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle maximum rating (5.0)', () => {
      const data = { ...validCourierData, rating: 5.0 };
      const courier = CourierEntity.create(data);
      expect(courier.rating).toBe(5.0);
      expect(courier.isEligibleForAssignment()).toBe(true);
    });

    it('should handle minimum valid rating (4.0)', () => {
      const data = { ...validCourierData, rating: 4.0 };
      const courier = CourierEntity.create(data);
      expect(courier.rating).toBe(4.0);
      expect(courier.isEligibleForAssignment()).toBe(true);
    });

    it('should handle perfect completion rate (1.0)', () => {
      const data = { ...validCourierData, completionRate: 1.0 };
      const courier = CourierEntity.create(data);
      expect(courier.completionRate).toBe(1.0);
      expect(courier.isEligibleForAssignment()).toBe(true);
    });

    it('should handle zero traffic experience', () => {
      const data = { ...validCourierData, trafficExperience: 0 };
      const courier = CourierEntity.create(data);
      expect(courier.trafficExperience).toBe(0);
    });

    it('should handle high traffic experience', () => {
      const data = { ...validCourierData, trafficExperience: 1.0 };
      const courier = CourierEntity.create(data);
      expect(courier.trafficExperience).toBe(1.0);
    });

    it('should handle different phone number formats', () => {
      const phones = [
        '+255712345678',
        '+255 712 345 678',
        '0712345678',
        '+1-555-123-4567'
      ];

      phones.forEach(phone => {
        const data = { ...validCourierData, phone };
        const courier = CourierEntity.create(data);
        expect(courier.phone).toBe(phone);
      });
    });
  });
});
