import { DeliverySaga, DeliverySagaContext } from '../../../application/sagas/delivery.saga';
import { ICourierRepository, IRouteRepository } from '../../../domain/repositories';
import { RealTimeTrackingPort } from '../../../domain/engines/ports/tracking.port';
import { CourierEntity } from '../../../domain/entities/courier.entity';
import { GeoPoint } from '../../../domain/value-objects/geopoint.value-object';
import { ISagaLogRepository, SagaStatus } from '../../../../../../shared/saga/saga.log';

// Mock implementations
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

const mockSagaLogRepository: jest.Mocked<ISagaLogRepository> = {
  save: jest.fn(),
  update: jest.fn(),
  getById: jest.fn(),
  saveStep: jest.fn(),
  updateStep: jest.fn(),
  getSteps: jest.fn()
};

const mockRouteRepository: jest.Mocked<IRouteRepository> = {
  save: jest.fn(),
  findById: jest.fn(),
  findByCourierId: jest.fn(),
  findAll: jest.fn(),
  updateRoute: jest.fn(),
  deleteRoute: jest.fn()
};

describe('DeliverySaga Compensation Integration Tests', () => {
  let deliverySaga: DeliverySaga;
  let deliveryData: DeliverySagaContext;

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

    deliveryData = {
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
      status: 'requested'
    };

    mockCourierRepository.findAvailableCouriers.mockResolvedValue([availableCourier as any]);
    mockCourierRepository.assignCourier.mockResolvedValue(undefined);
    mockCourierRepository.updateCourierAvailability.mockResolvedValue(undefined);
    mockSagaLogRepository.save.mockResolvedValue(undefined);
    mockSagaLogRepository.update.mockResolvedValue(undefined);
    mockSagaLogRepository.saveStep.mockResolvedValue(undefined);
    mockSagaLogRepository.updateStep.mockResolvedValue(undefined);

    deliverySaga = new DeliverySaga(
      mockSagaLogRepository,
      'logistics-service',
      mockCourierRepository,
      mockTrackingPort,
      mockRouteRepository
    );
  });

  describe('compensation logic', () => {
    it('should document irreversible steps (Section 7 compliance)', () => {
      const sagaSource = DeliverySaga.prototype.constructor.toString();
      // Wait, in my refactored code I put the comments inside defineSteps
      // Actually, I'll just check if the string exists in the file content if possible, 
      // but testing the constructor string is common.
      // My refactored code:
      // // DOCUMENTED AS IRREVERSIBLE: tracking data cannot be "untracked"

      // Let's check the view_file output from earlier to be sure where I put it.
      // It was inside defineSteps which is a method on the prototype.
      const defineStepsSource = (deliverySaga as any).defineSteps.toString();
      expect(defineStepsSource).toContain('DOCUMENTED AS IRREVERSIBLE');
    });

    it('should compensate when a step fails', async () => {
      // Simulate failure in "wait_for_pickup" step
      // Since defineSteps is called in constructor, we might need to mock a repository method 
      // that is called within a step to trigger a failure.

      // The "wait_for_pickup" step simulates a delay. 
      // We can't easily mock the internal setTimeout without jest.useFakeTimers().
      // Let's mock courierRepository.assignCourier to fail instead.

      mockCourierRepository.assignCourier.mockRejectedValue(new Error('Assignment failed'));

      const sagaId = await deliverySaga.start(deliveryData);

      // Wait for it to fail
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockSagaLogRepository.update).toHaveBeenCalledWith(sagaId, expect.objectContaining({
        status: SagaStatus.COMPENSATING
      }));

      // Status should be set to cancelled in compensate of assign_courier
      expect(deliveryData.status).toBe('cancelled');
    });

    it('should reverse availability when compensating assign_courier', async () => {
      // We want to trigger compensation of assign_courier.
      // This means a *later* step must fail.

      // Let's modify the defineSteps logic or just mock something that the later step uses.
      // "wait_for_pickup" doesn't use any repository.
      // "track_delivery" uses routeRepository.save().

      mockRouteRepository.save.mockRejectedValue(new Error('Route save failed'));

      const sagaId = await deliverySaga.start(deliveryData);

      // Wait for it to reach track_delivery (which is after assign_courier and wait_for_pickup)
      // wait_for_pickup takes 1s in my implementation.
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Verify assign_courier compensation was called
      expect(mockCourierRepository.updateCourierAvailability).toHaveBeenCalledWith('courier_789', true);
      expect(deliveryData.status).toBe('cancelled');
    });
  });
});

