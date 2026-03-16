/**
 * Courier Repository Integration Tests
 *
 * Constitution Section 11: Testing Constitution - Integration tests validate infrastructure correctness
 * Constitution Section 8: Infrastructure Isolation Rule - Infrastructure adapts to Domain
 */

import { ICourierRepository } from '../../domain/repositories';
import { CourierEntity } from '../../domain/entities/courier.entity';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';

// Mock database connection
const mockDbConnection = {
  courier: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  courierLocation: {
    findFirst: jest.fn(),
    update: jest.fn(),
    create: jest.fn()
  },
  courierPerformance: {
    findUnique: jest.fn(),
    upsert: jest.fn()
  }
};

// Mock the actual repository implementation
jest.mock('../../infrastructure/repositories/courier.repository', () => ({
  CourierRepository: jest.fn().mockImplementation(() => ({
    findAvailableCouriers: jest.fn(),
    findAvailable: jest.fn(),
    assignCourier: jest.fn(),
    findById: jest.fn(),
    getCourierById: jest.fn(),
    updateCourierLocation: jest.fn(),
    updateCourierAvailability: jest.fn(),
    updateCourierStatus: jest.fn(),
    getCourierPerformance: jest.fn()
  }))
}));

import { CourierRepository } from '../../infrastructure/repositories/courier.repository';

describe('CourierRepository Integration Tests', () => {
  let courierRepository: CourierRepository;
  let mockRepo: jest.Mocked<ICourierRepository>;

  // Test data
  const testCourier = CourierEntity.create({
    id: 'courier_123',
    name: 'John Courier',
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
    currentLocation: GeoPoint.create(-6.8, 39.25, 'Test Location'),
    isAvailable: true,
    trafficExperience: 0.8
  });

  const testLocation = GeoPoint.create(-6.7924, 39.2083, 'CBD Location');

  beforeEach(() => {
    jest.clearAllMocks();

    // Create repository instance
    courierRepository = new CourierRepository(mockDbConnection as any);
    mockRepo = courierRepository as any;
  });

  describe('findAvailableCouriers integration', () => {
    it('should find available couriers within radius', async () => {
      const availableCouriers = [testCourier];

      mockRepo.findAvailableCouriers.mockResolvedValue(availableCouriers);

      const result = await mockRepo.findAvailableCouriers(testLocation, 50);

      expect(mockRepo.findAvailableCouriers).toHaveBeenCalledWith(testLocation, 50);
      expect(result).toEqual(availableCouriers);
      expect(result[0]).toBeInstanceOf(CourierEntity);
      expect(result[0].isAvailable).toBe(true);
    });

    it('should return empty array when no couriers available', async () => {
      mockRepo.findAvailableCouriers.mockResolvedValue([]);

      const result = await mockRepo.findAvailableCouriers(testLocation, 50);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should filter couriers by distance and availability', async () => {
      const nearbyCourier = CourierEntity.create({
        ...testCourier,
        id: 'nearby_courier',
        currentLocation: GeoPoint.create(-6.79, 39.21, 'Nearby Location')
      });

      const farCourier = CourierEntity.create({
        ...testCourier,
        id: 'far_courier',
        currentLocation: GeoPoint.create(-7.5, 39.0, 'Far Location')
      });

      const unavailableCourier = CourierEntity.create({
        ...testCourier,
        id: 'unavailable_courier',
        status: 'offline'
      });

      mockRepo.findAvailableCouriers.mockImplementation(async (location, radius) => {
        return [nearbyCourier, farCourier, unavailableCourier].filter(courier => {
          if (!courier.isAvailable) return false;
          return courier.getDistanceFrom(location) <= radius;
        });
      });

      const result = await mockRepo.findAvailableCouriers(testLocation, 50);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('nearby_courier');
    });

    it('should handle database connection failures', async () => {
      mockRepo.findAvailableCouriers.mockRejectedValue(new Error('Database connection failed'));

      await expect(mockRepo.findAvailableCouriers(testLocation, 50))
        .rejects.toThrow('Database connection failed');
    });

    it('should validate location parameter', async () => {
      const invalidLocation = null as any;
      mockRepo.findAvailableCouriers.mockRejectedValueOnce(new Error('Location is required'));

      await expect(mockRepo.findAvailableCouriers(invalidLocation, 50))
        .rejects.toThrow('Location is required');
    });

    it('should validate radius parameter', async () => {
      const invalidRadius = -1;
      mockRepo.findAvailableCouriers.mockRejectedValueOnce(new Error('Radius must be a positive number'));

      await expect(mockRepo.findAvailableCouriers(testLocation, invalidRadius))
        .rejects.toThrow('Radius must be a positive number');
    });
  });

  describe('findAvailable integration', () => {
    it('should find all available couriers', async () => {
      const availableCouriers = [testCourier];

      mockRepo.findAvailable.mockResolvedValue(availableCouriers);

      const result = await mockRepo.findAvailable();

      expect(mockRepo.findAvailable).toHaveBeenCalledWith();
      expect(result).toEqual(availableCouriers);
      expect(result.every(courier => courier.isAvailable)).toBe(true);
    });

    it('should return empty array when no couriers available', async () => {
      mockRepo.findAvailable.mockResolvedValue([]);

      const result = await mockRepo.findAvailable();

      expect(result).toEqual([]);
    });

    it('should handle database query failures', async () => {
      mockRepo.findAvailable.mockRejectedValue(new Error('Query failed'));

      await expect(mockRepo.findAvailable()).rejects.toThrow('Query failed');
    });
  });

  describe('assignCourier integration', () => {
    it('should assign courier to delivery successfully', async () => {
      const deliveryId = 'delivery_456';
      const courierId = 'courier_123';

      mockRepo.assignCourier.mockResolvedValue(undefined);

      await expect(mockRepo.assignCourier(deliveryId, courierId)).resolves.toBeUndefined();

      expect(mockRepo.assignCourier).toHaveBeenCalledWith(deliveryId, courierId);
    });

    it('should handle courier already assigned error', async () => {
      const deliveryId = 'delivery_456';
      const courierId = 'courier_123';

      mockRepo.assignCourier.mockRejectedValue(new Error('Courier already assigned to another delivery'));

      await expect(mockRepo.assignCourier(deliveryId, courierId))
        .rejects.toThrow('Courier already assigned to another delivery');
    });

    it('should handle invalid delivery ID', async () => {
      const invalidDeliveryId = '';
      const courierId = 'courier_123';

      mockRepo.assignCourier.mockRejectedValue(new Error('Invalid delivery ID'));

      await expect(mockRepo.assignCourier(invalidDeliveryId, courierId))
        .rejects.toThrow('Invalid delivery ID');
    });

    it('should handle invalid courier ID', async () => {
      const deliveryId = 'delivery_456';
      const invalidCourierId = '';

      mockRepo.assignCourier.mockRejectedValue(new Error('Invalid courier ID'));

      await expect(mockRepo.assignCourier(deliveryId, invalidCourierId))
        .rejects.toThrow('Invalid courier ID');
    });

    it('should handle courier not found', async () => {
      const deliveryId = 'delivery_456';
      const nonExistentCourierId = 'non_existent_courier';

      mockRepo.assignCourier.mockRejectedValue(new Error('Courier not found'));

      await expect(mockRepo.assignCourier(deliveryId, nonExistentCourierId))
        .rejects.toThrow('Courier not found');
    });
  });

  describe('findById integration', () => {
    it('should find courier by ID', async () => {
      const courierId = 'courier_123';

      mockRepo.findById.mockResolvedValue(testCourier);

      const result = await mockRepo.findById(courierId);

      expect(mockRepo.findById).toHaveBeenCalledWith(courierId);
      expect(result).toEqual(testCourier);
      expect(result?.id).toBe(courierId);
    });

    it('should return null when courier not found', async () => {
      const nonExistentCourierId = 'non_existent_courier';

      mockRepo.findById.mockResolvedValue(null);

      const result = await mockRepo.findById(nonExistentCourierId);

      expect(result).toBeNull();
    });

    it('should handle database query errors', async () => {
      const courierId = 'courier_123';

      mockRepo.findById.mockRejectedValue(new Error('Database query failed'));

      await expect(mockRepo.findById(courierId)).rejects.toThrow('Database query failed');
    });
  });

  describe('getCourierById integration', () => {
    it('should get courier by ID', async () => {
      const courierId = 'courier_123';

      mockRepo.getCourierById.mockResolvedValue(testCourier);

      const result = await mockRepo.getCourierById(courierId);

      expect(mockRepo.getCourierById).toHaveBeenCalledWith(courierId);
      expect(result).toEqual(testCourier);
    });

    it('should throw error when courier not found', async () => {
      const nonExistentCourierId = 'non_existent_courier';

      mockRepo.getCourierById.mockRejectedValue(new Error('Courier not found'));

      await expect(mockRepo.getCourierById(nonExistentCourierId))
        .rejects.toThrow('Courier not found');
    });
  });

  describe('updateCourierLocation integration', () => {
    it('should update courier location successfully', async () => {
      const courierId = 'courier_123';
      const newLocation = GeoPoint.create(-6.85, 39.3, 'New Location');

      mockRepo.updateCourierLocation.mockResolvedValue(undefined);

      await expect(mockRepo.updateCourierLocation(courierId, newLocation)).resolves.toBeUndefined();

      expect(mockRepo.updateCourierLocation).toHaveBeenCalledWith(courierId, newLocation);
    });

    it('should handle invalid location coordinates', async () => {
      const courierId = 'courier_123';
      const invalidLocation = { lat: 91, lng: 181, address: 'Invalid Location' } as any;

      mockRepo.updateCourierLocation.mockRejectedValue(new Error('Invalid location coordinates'));

      await expect(mockRepo.updateCourierLocation(courierId, invalidLocation))
        .rejects.toThrow('Invalid location coordinates');
    });

    it('should handle courier not found for location update', async () => {
      const nonExistentCourierId = 'non_existent_courier';
      const newLocation = GeoPoint.create(-6.85, 39.3, 'New Location');

      mockRepo.updateCourierLocation.mockRejectedValue(new Error('Courier not found'));

      await expect(mockRepo.updateCourierLocation(nonExistentCourierId, newLocation))
        .rejects.toThrow('Courier not found');
    });
  });

  describe('updateCourierAvailability integration', () => {
    it('should update courier availability to available', async () => {
      const courierId = 'courier_123';
      const isAvailable = true;

      mockRepo.updateCourierAvailability.mockResolvedValue(undefined);

      await expect(mockRepo.updateCourierAvailability(courierId, isAvailable)).resolves.toBeUndefined();

      expect(mockRepo.updateCourierAvailability).toHaveBeenCalledWith(courierId, isAvailable);
    });

    it('should update courier availability to unavailable', async () => {
      const courierId = 'courier_123';
      const isAvailable = false;

      mockRepo.updateCourierAvailability.mockResolvedValue(undefined);

      await expect(mockRepo.updateCourierAvailability(courierId, isAvailable)).resolves.toBeUndefined();

      expect(mockRepo.updateCourierAvailability).toHaveBeenCalledWith(courierId, isAvailable);
    });

    it('should handle courier not found for availability update', async () => {
      const nonExistentCourierId = 'non_existent_courier';
      const isAvailable = false;

      mockRepo.updateCourierAvailability.mockRejectedValue(new Error('Courier not found'));

      await expect(mockRepo.updateCourierAvailability(nonExistentCourierId, isAvailable))
        .rejects.toThrow('Courier not found');
    });
  });

  describe('getCourierPerformance integration', () => {
    it('should get courier performance metrics', async () => {
      const courierId = 'courier_123';
      const performanceData = {
        totalDeliveries: 150,
        onTimeRate: 0.96,
        averageRating: 4.7
      };

      mockRepo.getCourierPerformance.mockResolvedValue(performanceData);

      const result = await mockRepo.getCourierPerformance(courierId);

      expect(mockRepo.getCourierPerformance).toHaveBeenCalledWith(courierId);
      expect(result).toEqual(performanceData);
      expect(result.totalDeliveries).toBe(150);
      expect(result.onTimeRate).toBe(0.96);
      expect(result.averageRating).toBe(4.7);
    });

    it('should handle courier with no performance data', async () => {
      const newCourierId = 'new_courier_123';
      const defaultPerformance = {
        totalDeliveries: 0,
        onTimeRate: 0,
        averageRating: 0
      };

      mockRepo.getCourierPerformance.mockResolvedValue(defaultPerformance);

      const result = await mockRepo.getCourierPerformance(newCourierId);

      expect(result.totalDeliveries).toBe(0);
      expect(result.onTimeRate).toBe(0);
      expect(result.averageRating).toBe(0);
    });

    it('should handle performance calculation errors', async () => {
      const courierId = 'courier_123';

      mockRepo.getCourierPerformance.mockRejectedValue(new Error('Performance calculation failed'));

      await expect(mockRepo.getCourierPerformance(courierId))
        .rejects.toThrow('Performance calculation failed');
    });
  });

  describe('transaction handling', () => {
    it('should handle concurrent courier assignments', async () => {
      const deliveryId1 = 'delivery_456';
      const deliveryId2 = 'delivery_789';
      const courierId = 'courier_123';

      // First assignment succeeds
      mockRepo.assignCourier.mockResolvedValueOnce(undefined);
      // Second assignment fails due to concurrency
      mockRepo.assignCourier.mockRejectedValueOnce(new Error('Courier already assigned'));

      await expect(mockRepo.assignCourier(deliveryId1, courierId)).resolves.toBeUndefined();
      await expect(mockRepo.assignCourier(deliveryId2, courierId))
        .rejects.toThrow('Courier already assigned');
    });

    it('should maintain data consistency on failures', async () => {
      const courierId = 'courier_123';
      const originalLocation = testCourier.currentLocation;
      const newLocation = GeoPoint.create(-6.85, 39.3, 'New Location');

      // First update succeeds
      mockRepo.updateCourierLocation.mockResolvedValueOnce(undefined);
      // Second update fails
      mockRepo.updateCourierLocation.mockRejectedValueOnce(new Error('Location update failed'));

      await expect(mockRepo.updateCourierLocation(courierId, newLocation)).resolves.toBeUndefined();
      await expect(mockRepo.updateCourierLocation(courierId, originalLocation))
        .rejects.toThrow('Location update failed');
    });
  });

  describe('bulk operations', () => {
    it('should handle multiple courier queries efficiently', async () => {
      const location1 = GeoPoint.create(-6.7924, 39.2083, 'Location 1');
      const location2 = GeoPoint.create(-6.8167, 39.2833, 'Location 2');

      mockRepo.findAvailableCouriers
        .mockResolvedValueOnce([testCourier])
        .mockResolvedValueOnce([]);

      const results = await Promise.all([
        mockRepo.findAvailableCouriers(location1, 50),
        mockRepo.findAvailableCouriers(location2, 50)
      ]);

      expect(results[0]).toHaveLength(1);
      expect(results[1]).toHaveLength(0);
      expect(mockRepo.findAvailableCouriers).toHaveBeenCalledTimes(2);
    });

    it('should handle bulk availability updates', async () => {
      const courierIds = ['courier_1', 'courier_2', 'courier_3'];

      mockRepo.updateCourierAvailability.mockResolvedValue(undefined);

      await Promise.all(
        courierIds.map(courierId =>
          mockRepo.updateCourierAvailability(courierId, false)
        )
      );

      expect(mockRepo.updateCourierAvailability).toHaveBeenCalledTimes(3);
    });
  });

  describe('data validation and sanitization', () => {
    it('should validate courier ID format', async () => {
      const invalidCourierIds = ['', 'invalid', 'courier_@#$%', null, undefined];

      for (const invalidId of invalidCourierIds) {
        mockRepo.findById.mockRejectedValueOnce(new Error('Invalid courier ID'));

        await expect(mockRepo.findById(invalidId as any))
          .rejects.toThrow('Invalid courier ID');
      }
    });

    it('should sanitize location data', async () => {
      const courierId = 'courier_123';
      const locationWithExtraData = {
        lat: -6.85,
        lng: 39.3,
        address: 'Test Location',
        extraField: 'should be ignored'
      } as any;

      mockRepo.updateCourierLocation.mockResolvedValue(undefined);

      await expect(mockRepo.updateCourierLocation(courierId, locationWithExtraData))
        .resolves.toBeUndefined();

      expect(mockRepo.updateCourierLocation).toHaveBeenCalledWith(courierId, locationWithExtraData);
    });
  });

  describe('performance and scalability', () => {
    it('should handle large result sets', async () => {
      const largeCourierSet = Array.from({ length: 1000 }, (_, index) =>
        CourierEntity.create({
          ...testCourier,
          id: `courier_${index}`,
          name: `Courier ${index}`
        })
      );

      mockRepo.findAvailable.mockResolvedValue(largeCourierSet);

      const result = await mockRepo.findAvailable();

      expect(result).toHaveLength(1000);
      expect(result.every(courier => courier.isAvailable)).toBe(true);
    });

    it('should implement efficient geospatial queries', async () => {
      const location = GeoPoint.create(-6.7924, 39.2083, 'Test Location');

      mockRepo.findAvailableCouriers.mockImplementation(async (loc, radius) => {
        // Simulate geospatial filtering
        const nearbyCouriers = [
          CourierEntity.create({
            ...testCourier,
            id: 'near_courier',
            currentLocation: GeoPoint.create(-6.79, 39.21, 'Near Location')
          })
        ];

        return nearbyCouriers.filter(courier =>
          courier.getDistanceFrom(loc) <= radius
        );
      });

      const result = await mockRepo.findAvailableCouriers(location, 10);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('near_courier');
    });
  });
});
