/**
 * Delivery Saga Integration Tests
 *
 * Constitution Section 11: Testing Constitution - Saga tests must validate orchestration & compensation
 * Constitution Section 6: Saga Orchestration Law - Only sagas may coordinate multiple services
 * Constitution Section 7: Compensation Completeness Rule - Every saga step must have compensation
 */

import { DeliverySaga, createDeliverySaga } from '../../../application/sagas/delivery.saga';
import { CourierRepositoryPort } from '../../../domain/engines/ports/courier.port';
import { RealTimeTrackingPort } from '../../../domain/engines/ports/tracking.port';
import { CourierEntity } from '../../../domain/entities/courier.entity';
import { GeoPoint } from '../../../domain/value-objects/geopoint.value-object';

// Mock implementations using Jest mocks
const mockCourierPort: jest.Mocked<CourierRepositoryPort> = {
  findAvailableCouriers: jest.fn(),
  findAvailable: jest.fn(),
  assignCourier: jest.fn(),
  findById: jest.fn(),
  getCourierById: jest.fn(),
  updateCourierLocation: jest.fn(),
  updateCourierAvailability: jest.fn(),
  getCourierPerformance: jest.fn()
};

const mockTrackingPort: jest.Mocked<RealTimeTrackingPort> = {
  storeLocationUpdate: jest.fn(),
  getCourierLocation: jest.fn(),
  getDeliveryTracking: jest.fn(),
  getLocationHistory: jest.fn(),
  calculateETA: jest.fn(),
  detectAnomalies: jest.fn()
};

describe('DeliverySaga Integration Tests', () => {
  let deliverySaga: DeliverySaga;

  // Test data
  const deliveryData = {
    deliveryId: 'delivery_123',
    orderId: 'order_456',
    pickupLocation: {
      lat: -6.7924,
      lng: 39.2083,
      address: 'Dar es Salaam CBD'
    },
    deliveryLocation: {
      lat: -6.8167,
      lng: 39.2833,
      address: 'Msasani'
    },
    status: 'requested' as const,
    compensationActions: []
  };

  const availableCourier = CourierEntity.create({
    id: 'courier_789',
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
    currentLocation: GeoPoint.create(-6.8, 39.25, 'Courier Location'),
    isAvailable: true,
    estimatedArrivalTime: 10,
    trafficExperience: 0.8
  });

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Set up default mock behaviors
    mockCourierPort.findAvailableCouriers.mockResolvedValue([availableCourier]);
    mockCourierPort.assignCourier.mockResolvedValue(undefined);
    mockCourierPort.findAvailable.mockResolvedValue([availableCourier]);

    deliverySaga = createDeliverySaga(mockCourierPort, mockTrackingPort);
  });

  describe('successful delivery orchestration', () => {
    it('should orchestrate complete delivery workflow successfully', async () => {
      const sagaId = await deliverySaga.start(deliveryData);

      expect(sagaId).toMatch(/^saga_\d+_[a-z0-9]+$/);

      const context = deliverySaga.getContext();
      expect(context).not.toBeNull();
      expect(context!.status).toBe('completed');
      expect(context!.data.status).toBe('delivered');
      expect(context!.data.courierId).toBe('courier_789');

      // Verify courier assignment was called
      expect(mockCourierPort.assignCourier).toHaveBeenCalledWith('delivery_123', 'courier_789');

      // Verify all steps completed
      expect(context!.completedSteps).toEqual(['assignCourier', 'waitForPickup', 'trackDelivery', 'confirmDelivery']);
      expect(context!.failedSteps).toEqual([]);
    });

    it('should update delivery status through all stages', async () => {
      await deliverySaga.start(deliveryData);

      const context = deliverySaga.getContext();

      // Verify status progression
      expect(context!.data.status).toBe('delivered');
      expect(context!.data.assignedAt).toBeInstanceOf(Date);
      expect(context!.data.pickedUpAt).toBeInstanceOf(Date);
      expect(context!.data.deliveredAt).toBeInstanceOf(Date);
    });

    it('should publish all delivery events in correct sequence', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await deliverySaga.start(deliveryData);

      // Verify events were published (checking console logs for now)
      const logCalls = consoleSpy.mock.calls.filter(call =>
        call[0] === 'Saga Event: CourierAssigned' ||
        call[0] === 'Saga Event: DeliveryPickedUp' ||
        call[0] === 'Saga Event: DeliveryInTransit' ||
        call[0] === 'Saga Event: DeliveryDelivered'
      );

      expect(logCalls).toHaveLength(4);

      // Verify event sequence
      expect(logCalls[0][0]).toBe('Saga Event: CourierAssigned');
      expect(logCalls[1][0]).toBe('Saga Event: DeliveryPickedUp');
      expect(logCalls[2][0]).toBe('Saga Event: DeliveryInTransit');
      expect(logCalls[3][0]).toBe('Saga Event: DeliveryDelivered');

      consoleSpy.mockRestore();
    });
  });

  describe('courier assignment step', () => {
    it('should assign available courier near pickup location', async () => {
      await deliverySaga.start(deliveryData);

      const context = deliverySaga.getContext();
      expect(context!.data.courierId).toBe('courier_789');
      expect(context!.data.status).toBe('delivered'); // Saga completes successfully
    });

    it('should fail when no couriers are available', async () => {
      mockCourierPort.findAvailableCouriers.mockResolvedValueOnce([]); // No available couriers

      await expect(deliverySaga.start(deliveryData)).rejects.toThrow('No couriers available for delivery');

      const context = deliverySaga.getContext();
      expect(context!.status).toBe('failed');
      expect(context!.data.status).toBe('requested'); // Status unchanged
    });

    it('should fail when available couriers are too far', async () => {
      const farCourier = CourierEntity.create({
        ...availableCourier,
        currentLocation: GeoPoint.create(-7.5, 39.0, 'Far Location'), // 80km away
        id: 'far_courier'
      });
      mockCourierPort.findAvailableCouriers.mockResolvedValueOnce([farCourier]);

      await expect(deliverySaga.start(deliveryData)).rejects.toThrow('No couriers available for delivery');

      const context = deliverySaga.getContext();
      expect(context!.status).toBe('failed');
    });

    it('should select first available courier when multiple are available', async () => {
      const courier2 = CourierEntity.create({
        ...availableCourier,
        id: 'courier_999',
        name: 'Jane Courier'
      });

      mockCourierPort.findAvailableCouriers.mockResolvedValueOnce([availableCourier, courier2]);

      await deliverySaga.start(deliveryData);

      const context = deliverySaga.getContext();
      expect(context!.data.courierId).toBe('courier_789'); // First in array
    });
  });

  describe('pickup and delivery workflow', () => {
    it('should progress through pickup and delivery states', async () => {
      await deliverySaga.start(deliveryData);

      const context = deliverySaga.getContext();

      // Verify all status transitions occurred
      expect(context!.data.status).toBe('delivered');
      expect(context!.data.assignedAt).toBeDefined();
      expect(context!.data.pickedUpAt).toBeDefined();
      expect(context!.data.deliveredAt).toBeDefined();
    });

    it('should set timestamps for each delivery stage', async () => {
      const beforeStart = Date.now();
      await deliverySaga.start(deliveryData);
      const afterComplete = Date.now();

      const context = deliverySaga.getContext();

      expect(context!.data.assignedAt!.getTime()).toBeGreaterThanOrEqual(beforeStart);
      expect(context!.data.pickedUpAt!.getTime()).toBeGreaterThanOrEqual(beforeStart);
      expect(context!.data.deliveredAt!.getTime()).toBeGreaterThanOrEqual(beforeStart);

      expect(context!.data.assignedAt!.getTime()).toBeLessThanOrEqual(afterComplete);
      expect(context!.data.pickedUpAt!.getTime()).toBeLessThanOrEqual(afterComplete);
      expect(context!.data.deliveredAt!.getTime()).toBeLessThanOrEqual(afterComplete);
    });
  });

  describe('event publishing validation', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should publish CourierAssigned event with correct data', async () => {
      await deliverySaga.start(deliveryData);

      const courierAssignedCall = consoleSpy.mock.calls.find(call =>
        call[0] === 'Saga Event: CourierAssigned'
      );

      expect(courierAssignedCall).toBeDefined();
      const event = courierAssignedCall![1];

      expect(event.eventType).toBe('CourierAssigned');
      expect(event.aggregateId).toBe('delivery_123');
      expect(event.data.courierId).toBe('courier_789');
      expect(event.data.courierName).toBe('John Courier');
      expect(event.data.vehicleType).toBe('motorcycle');
      expect(event.data.estimatedArrival).toBeInstanceOf(Date);
    });

    it('should publish DeliveryPickedUp event with pickup time', async () => {
      await deliverySaga.start(deliveryData);

      const pickupCall = consoleSpy.mock.calls.find(call =>
        call[0] === 'Saga Event: DeliveryPickedUp'
      );

      expect(pickupCall).toBeDefined();
      const event = pickupCall![1];

      expect(event.eventType).toBe('DeliveryPickedUp');
      expect(event.aggregateId).toBe('delivery_123');
      expect(event.data.courierId).toBe('courier_789');
      expect(event.data.pickupTime).toBeInstanceOf(Date);
    });

    it('should publish DeliveryInTransit event with route data', async () => {
      await deliverySaga.start(deliveryData);

      const transitCall = consoleSpy.mock.calls.find(call =>
        call[0] === 'Saga Event: DeliveryInTransit'
      );

      expect(transitCall).toBeDefined();
      const event = transitCall![1];

      expect(event.eventType).toBe('DeliveryInTransit');
      expect(event.aggregateId).toBe('delivery_123');
      expect(event.data.courierId).toBe('courier_789');
      expect(event.data.route).toBeDefined();
      expect(event.data.route.waypoints).toHaveLength(2);
      expect(event.data.route.estimatedDuration).toBe(45);
    });

    it('should publish DeliveryDelivered event with delivery time', async () => {
      await deliverySaga.start(deliveryData);

      const deliveryCall = consoleSpy.mock.calls.find(call =>
        call[0] === 'Saga Event: DeliveryDelivered'
      );

      expect(deliveryCall).toBeDefined();
      const event = deliveryCall![1];

      expect(event.eventType).toBe('DeliveryDelivered');
      expect(event.aggregateId).toBe('delivery_123');
      expect(event.data.courierId).toBe('courier_789');
      expect(event.data.deliveryTime).toBeInstanceOf(Date);
    });
  });

  describe('integration with domain entities', () => {
    it('should integrate with CourierEntity for assignment', async () => {
      await deliverySaga.start(deliveryData);

      const context = deliverySaga.getContext();
      const assignedCourierId = context!.data.courierId;

      // Verify the assigned courier is valid
      expect(assignedCourierId).toBe('courier_789');

      // Verify courier assignment was called
      expect(mockCourierPort.assignCourier).toHaveBeenCalledWith('delivery_123', 'courier_789');
    });

    it('should handle different courier configurations', async () => {
      const premiumCourier = CourierEntity.create({
        ...availableCourier,
        id: 'premium_courier',
        name: 'Premium Courier',
        vehicle: {
          type: 'car',
          capacity: {
            maxWeight: 100,
            maxVolume: 2.0,
            maxItems: 20
          }
        }
      });

      mockCourierPort.findAvailableCouriers.mockResolvedValueOnce([premiumCourier]);

      await deliverySaga.start(deliveryData);

      const context = deliverySaga.getContext();
      expect(context!.data.courierId).toBe('premium_courier');
    });
  });

  describe('route and location handling', () => {
    it('should create proper route waypoints for delivery', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await deliverySaga.start(deliveryData);

      const transitCall = consoleSpy.mock.calls.find(call =>
        call[0] === 'Saga Event: DeliveryInTransit'
      );

      const route = transitCall![1].data.route;

      expect(route.waypoints).toHaveLength(2);
      expect(route.waypoints[0]).toEqual({
        lat: -6.7924,
        lng: 39.2083,
        type: 'pickup'
      });
      expect(route.waypoints[1]).toEqual({
        lat: -6.8167,
        lng: 39.2833,
        type: 'delivery'
      });

      consoleSpy.mockRestore();
    });
  });

  describe('saga lifecycle management', () => {
    it('should maintain proper saga context throughout execution', async () => {
      await deliverySaga.start(deliveryData);

      const context = deliverySaga.getContext();

      expect(context!.sagaId).toMatch(/^saga_\d+_[a-z0-9]+$/);
      expect(context!.startTime).toBeInstanceOf(Date);
      expect(context!.status).toBe('completed');
      expect(context!.data.deliveryId).toBe('delivery_123');
      expect(context!.data.orderId).toBe('order_456');
      expect(context!.data.status).toBe('delivered');
    });

    it('should handle multiple saga instances independently', async () => {
      const saga1 = createDeliverySaga(mockCourierPort, mockTrackingPort);
      const saga2 = createDeliverySaga(mockCourierPort, mockTrackingPort);

      const deliveryData2 = {
        ...deliveryData,
        deliveryId: 'delivery_999',
        orderId: 'order_888'
      };

      await Promise.all([
        saga1.start(deliveryData),
        saga2.start(deliveryData2)
      ]);

      const context1 = saga1.getContext();
      const context2 = saga2.getContext();

      expect(context1!.data.deliveryId).toBe('delivery_123');
      expect(context2!.data.deliveryId).toBe('delivery_999');
      expect(context1!.sagaId).not.toBe(context2!.sagaId);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle courier assignment failures gracefully', async () => {
      mockCourierPort.findAvailableCouriers.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(deliverySaga.start(deliveryData)).rejects.toThrow('Database connection failed');

      const context = deliverySaga.getContext();
      expect(context!.status).toBe('failed');
      expect(context!.data.status).toBe('requested'); // Unchanged
    });

    it('should handle tracking failures', async () => {
      mockTrackingPort.storeLocationUpdate = jest.fn().mockRejectedValue(new Error('Tracking service unavailable'));

      await expect(deliverySaga.start(deliveryData)).rejects.toThrow('Tracking service unavailable');

      const context = deliverySaga.getContext();
      expect(context!.status).toBe('failed');
    });

    it('should handle invalid delivery data', async () => {
      const invalidData = {
        ...deliveryData,
        pickupLocation: null, // Invalid
        deliveryLocation: null // Invalid
      };

      // The saga might not handle this gracefully, but should fail appropriately
      await expect(deliverySaga.start(invalidData as any)).rejects.toThrow();
    });
  });
});
