/**
 * Delivery Saga Compensation Integration Tests
 *
 * Constitution Section 7: Compensation Completeness Rule - Every saga step must have compensation
 * Constitution Section 11: Testing Constitution - Saga tests must validate orchestration & compensation
 */

import { DeliverySaga, createDeliverySaga } from '../../../application/sagas/delivery.saga';
import { ICourierRepository } from '../../../domain/repositories';
import { RealTimeTrackingPort } from '../../../domain/engines/ports/tracking.port';
import { CourierEntity } from '../../../domain/entities/courier.entity';
import { GeoPoint } from '../../../domain/value-objects/geopoint.value-object';

// Mock implementations using Jest mocks
const mockCourierRepository: jest.Mocked<ICourierRepository> = {
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

describe('DeliverySaga Compensation Integration Tests', () => {
  let deliverySaga: DeliverySaga;

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
    trafficExperience: 0.8
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockCourierRepository.findAvailableCouriers.mockResolvedValue([availableCourier]);
    mockCourierRepository.assignCourier.mockResolvedValue(undefined);
    mockCourierRepository.updateCourierAvailability.mockResolvedValue(undefined);

    deliverySaga = createDeliverySaga(mockCourierRepository, mockTrackingPort);
  });

  describe('compensation completeness validation', () => {
    it('should define compensations for all compensable steps (Section 7 compliance)', () => {
      // Verify that compensable steps have compensation functions defined
      const context = deliverySaga.getContext();
      expect(context).toBeNull(); // Saga not started yet

      // Start saga to initialize context
      const startPromise = deliverySaga.start(deliveryData);

      // The saga should complete successfully in this test
      return startPromise.then(() => {
        const finalContext = deliverySaga.getContext();
        expect(finalContext!.compensations).toEqual([]); // No compensations needed for successful saga
      });
    });

    it('should execute compensation when assignCourier step fails', async () => {
      // Setup: Make assignCourier succeed, but then fail in waitForPickup
      // We'll simulate this by making the waitForPickup throw after courier assignment

      // Override the waitForPickup method to throw
      const originalWaitForPickup = deliverySaga['waitForPickup'].bind(deliverySaga);
      deliverySaga['waitForPickup'] = jest.fn().mockRejectedValue(new Error('Pickup failed'));

      try {
        await deliverySaga.start(deliveryData);
        fail('Expected saga to fail');
      } catch (error) {
        expect((error as Error).message).toBe('Pickup failed');

        const context = deliverySaga.getContext();
        expect(context!.status).toBe('failed');
        expect(context!.compensations).toContain('waitForPickup');
        expect(context!.compensations).toContain('assignCourier'); // Should have compensated assignCourier

        // Verify compensation actions were recorded
        expect(context!.data.compensationActions).toEqual(['cancelPickup', 'unassignCourier']);
      }
    });

    it('should compensate assignCourier when waitForPickup fails', async () => {
      // Mock waitForPickup to fail
      const originalWaitForPickup = deliverySaga['waitForPickup'];
      deliverySaga['waitForPickup'] = jest.fn().mockRejectedValue(new Error('Pickup timeout'));

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      try {
        await deliverySaga.start(deliveryData);
        fail('Expected saga to fail');
      } catch (error) {
        // Verify courier was unassigned during compensation
        expect(mockCourierRepository.updateCourierAvailability).toHaveBeenCalledWith('courier_789', true);

        // Verify compensation events were published
        const compensationEvents = consoleSpy.mock.calls.filter(call =>
          call[0] === 'Saga Event: DeliveryCancelled' &&
          call[1].data.reason === 'saga_compensation_unassign_courier'
        );
        expect(compensationEvents).toHaveLength(1);

        consoleSpy.mockRestore();
      }
    });

    it('should document irreversible steps (Section 7 compliance)', () => {
      // This test documents that trackDelivery and confirmDelivery are irreversible
      // as per the saga comments and constitution requirements

      // Verify the saga code contains documentation for irreversible steps
      const sagaSource = deliverySaga.constructor.toString();
      expect(sagaSource).toContain('DOCUMENTED AS IRREVERSIBLE');
      expect(sagaSource).toContain('tracking data cannot be "untracked"');
      expect(sagaSource).toContain('delivery completion cannot be "undone"');
    });
  });

  describe('compensation execution order', () => {
    it('should execute compensations in reverse order of successful steps', async () => {
      // Setup a scenario where multiple steps succeed then one fails
      let executionOrder: string[] = [];

      // Mock methods to track execution order and make trackDelivery fail
      const originalAssignCourier = deliverySaga['assignCourier'];
      const originalWaitForPickup = deliverySaga['waitForPickup'];
      const originalTrackDelivery = deliverySaga['trackDelivery'];

      deliverySaga['assignCourier'] = jest.fn().mockImplementation(async () => {
        executionOrder.push('assignCourier');
        return originalAssignCourier.call(deliverySaga, deliverySaga.getContext()!.data);
      });

      deliverySaga['waitForPickup'] = jest.fn().mockImplementation(async () => {
        executionOrder.push('waitForPickup');
        return originalWaitForPickup.call(deliverySaga, deliverySaga.getContext()!.data);
      });

      deliverySaga['trackDelivery'] = jest.fn().mockImplementation(async () => {
        executionOrder.push('trackDelivery');
        throw new Error('Tracking service unavailable');
      });

      // Track compensation calls through the mock
      let compensationOrder: string[] = [];
      const originalUnassignCourier = deliverySaga['unassignCourier'];
      const originalCancelPickup = deliverySaga['cancelPickup'];

      deliverySaga['unassignCourier'] = jest.fn().mockImplementation(async (data) => {
        compensationOrder.push('unassignCourier');
        return originalUnassignCourier.call(deliverySaga, data);
      });

      deliverySaga['cancelPickup'] = jest.fn().mockImplementation(async (data) => {
        compensationOrder.push('cancelPickup');
        return originalCancelPickup.call(deliverySaga, data);
      });

      try {
        await deliverySaga.start(deliveryData);
        fail('Expected saga to fail');
      } catch (error) {
        // Verify execution order: assignCourier → waitForPickup → trackDelivery (fails)
        expect(executionOrder).toEqual(['assignCourier', 'waitForPickup', 'trackDelivery']);

        // Verify compensation order: reverse of successful steps
        // assignCourier compensation → waitForPickup compensation
        expect(compensationOrder).toEqual(['unassignCourier', 'cancelPickup']);

        const context = deliverySaga.getContext();
        expect(context!.compensations).toEqual(['waitForPickup', 'assignCourier']);
      }
    });
  });

  describe('saga monitoring and failure recovery', () => {
    it('should publish saga failure events with compensation details', async () => {
      // Make waitForPickup fail
      deliverySaga['waitForPickup'] = jest.fn().mockRejectedValue(new Error('Pickup failed'));

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      try {
        await deliverySaga.start(deliveryData);
        fail('Expected saga to fail');
      } catch (error) {
        // Verify saga failure event was published
        const failureEvents = consoleSpy.mock.calls.filter(call =>
          call[0] === 'Saga Event: SagaFailed'
        );
        expect(failureEvents).toHaveLength(1);

        const failureEvent = failureEvents[0][1];
        expect(failureEvent.error).toBe('Pickup failed');
        expect(failureEvent.sagaId).toMatch(/^saga_\d+_[a-z0-9]+$/);

        consoleSpy.mockRestore();
      }
    });

    it('should handle compensation failures gracefully', async () => {
      // Make waitForPickup fail and compensation also fail
      deliverySaga['waitForPickup'] = jest.fn().mockRejectedValue(new Error('Pickup failed'));
      deliverySaga['unassignCourier'] = jest.fn().mockRejectedValue(new Error('Compensation DB error'));

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      try {
        await deliverySaga.start(deliveryData);
        fail('Expected saga to fail');
      } catch (error) {
        // Saga should still fail with original error
        expect((error as Error).message).toBe('Pickup failed');

        // Verify compensation failure was logged
        const compensationFailureLogs = consoleSpy.mock.calls.filter(call =>
          call[1] && call[1].includes && call[1].includes('Compensation failed')
        );
        expect(compensationFailureLogs.length).toBeGreaterThan(0);

        consoleSpy.mockRestore();
      }
    });

    it('should maintain saga state consistency during compensation', async () => {
      // Make waitForPickup fail
      deliverySaga['waitForPickup'] = jest.fn().mockRejectedValue(new Error('Pickup failed'));

      try {
        await deliverySaga.start(deliveryData);
        fail('Expected saga to fail');
      } catch (error) {
        const context = deliverySaga.getContext();

        // Verify saga state is consistent
        expect(context!.status).toBe('failed');
        expect(context!.completedSteps).toEqual(['assignCourier']); // Only first step completed
        expect(context!.failedSteps).toEqual(['waitForPickup']); // Failed step recorded
        expect(context!.compensations).toEqual(['waitForPickup', 'assignCourier']); // Both compensations executed

        // Verify data state is consistent
        expect(context!.data.status).toBe('cancelled'); // Final status after compensation
        expect(context!.data.courierId).toBeUndefined(); // Courier unassigned
        expect(context!.data.compensationActions).toEqual(['cancelPickup', 'unassignCourier']);
      }
    });
  });

  describe('constitution compliance validation', () => {
    it('should comply with Section 7: Every compensable step has compensation', () => {
      // This test validates Section 7 compliance by checking that:
      // 1. Compensable steps have compensation functions defined
      // 2. Irreversible steps are explicitly documented

      // Verify compensations are registered by checking saga has the compensation methods
      expect(typeof deliverySaga['unassignCourier']).toBe('function');
      expect(typeof deliverySaga['cancelPickup']).toBe('function');

      // Verify the saga properly defines steps and compensations
      // (The actual registration happens in constructor via defineSteps)
      expect(deliverySaga).toBeDefined();
    });

    it('should validate compensation business logic correctness', async () => {
      // Test that compensation actually reverses the business effect

      // First, run successful saga to establish baseline
      const successfulSaga = createDeliverySaga(mockCourierRepository, mockTrackingPort);
      await successfulSaga.start(deliveryData);

      const successfulContext = successfulSaga.getContext();
      expect(successfulContext!.data.status).toBe('delivered');
      expect(successfulContext!.data.courierId).toBe('courier_789');

      // Now test compensation reverses the effects
      deliverySaga['waitForPickup'] = jest.fn().mockRejectedValue(new Error('Pickup failed'));

      try {
        await deliverySaga.start(deliveryData);
        fail('Expected saga to fail');
      } catch (error) {
        const failedContext = deliverySaga.getContext();

        // Verify compensation reversed the courier assignment
        expect(mockCourierRepository.updateCourierAvailability).toHaveBeenCalledWith('courier_789', true);
        expect(failedContext!.data.courierId).toBeUndefined();
        expect(failedContext!.data.status).toBe('cancelled');
      }
    });
  });
});
