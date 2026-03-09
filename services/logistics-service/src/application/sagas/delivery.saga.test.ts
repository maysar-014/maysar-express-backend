import { DeliverySaga } from './delivery.saga';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';

describe('DeliverySaga', () => {
  const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

  afterAll(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createContext = () => ({
    deliveryId: 'del-1',
    orderId: 'ord-1',
    buyerId: 'buyer-1',
    paymentMethod: 'COD',
    pickupLocation: { lat: -6.79, lng: 39.2, address: 'Pickup' },
    deliveryLocation: { lat: -6.8, lng: 39.21, address: 'Drop' },
    status: 'requested' as const,
    requestId: 'req-1'
  });

  const buildSaga = (opts?: {
    withRoute?: boolean;
    withDomainService?: boolean;
  }) => {
    const courierRepository = {
      findAvailableCouriers: jest.fn(),
      assignCourier: jest.fn().mockResolvedValue(undefined),
      updateCourierAvailability: jest.fn().mockResolvedValue(undefined)
    };
    const trackingPort = {} as any;
    const routeRepository = { save: jest.fn().mockResolvedValue(undefined) };
    const routeCreationService = {
      createRouteForSingleDelivery: jest.fn().mockResolvedValue({
        route: { id: 'route-1' }
      })
    };
    const courierDomainService = {
      calculateEstimatedArrivalTime: jest.fn().mockResolvedValue({
        estimatedMinutes: 20
      })
    };

    const saga = new DeliverySaga(
      {} as any,
      'logistics-service',
      courierRepository as any,
      trackingPort,
      opts?.withRoute === false ? undefined : (routeRepository as any),
      opts?.withRoute === false ? undefined : (routeCreationService as any),
      opts?.withDomainService === false ? undefined : (courierDomainService as any)
    );
    const publishSpy = jest.spyOn(saga as any, 'publishCommand').mockResolvedValue(undefined);

    return {
      saga,
      courierRepository,
      routeRepository,
      routeCreationService,
      courierDomainService,
      publishSpy
    };
  };

  it('defines expected delivery orchestration steps', () => {
    const { saga } = buildSaga();
    const steps = (saga as any).steps;
    expect(steps.map((s: any) => s.name)).toEqual([
      'assign_courier',
      'wait_for_pickup',
      'track_delivery',
      'confirm_delivery'
    ]);
  });

  it('assign_courier selects courier, assigns, and emits CourierAssigned', async () => {
    const { saga, courierRepository, courierDomainService, routeRepository, routeCreationService, publishSpy } =
      buildSaga();
    const step = (saga as any).steps[0];
    const context: any = createContext();

    courierRepository.findAvailableCouriers.mockResolvedValue([
      {
        id: 'cour-1',
        name: 'Courier One',
        phone: '+255700000001',
        vehicle: { type: 'bike', capacity: { maxWeight: 20, maxVolume: 1, maxItems: 10 } },
        rating: 4.8,
        completionRate: 0.97,
        currentLocation: GeoPoint.create(-6.7901, 39.2001, 'Current'),
        isAvailable: true,
        trafficExperience: 0.9
      }
    ]);

    await step.execute(context, 'saga-1');

    expect(courierRepository.assignCourier).toHaveBeenCalledWith('del-1', 'cour-1');
    expect(courierDomainService.calculateEstimatedArrivalTime).toHaveBeenCalled();
    expect(routeCreationService.createRouteForSingleDelivery).toHaveBeenCalled();
    expect(routeRepository.save).toHaveBeenCalled();
    expect(context).toEqual(
      expect.objectContaining({
        courierId: 'cour-1',
        status: 'assigned',
        assignedAt: expect.any(Date)
      })
    );
    expect(publishSpy).toHaveBeenCalledWith(
      'CourierAssigned',
      expect.objectContaining({
        courierId: 'cour-1',
        courierName: 'Courier One',
        vehicleType: 'bike',
        estimatedArrival: expect.any(Date)
      }),
      'req-1',
      'saga-1'
    );
  });

  it('assign_courier throws when no couriers available', async () => {
    const { saga, courierRepository } = buildSaga();
    const step = (saga as any).steps[0];
    courierRepository.findAvailableCouriers.mockResolvedValue([]);

    await expect(step.execute(createContext(), 'saga-2')).rejects.toThrow('No couriers available for delivery');
  });

  it('assign_courier falls back to static ETA when domain service is absent', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-08T10:00:00.000Z'));
    const { saga, courierRepository, publishSpy } = buildSaga({ withDomainService: false, withRoute: false });
    const step = (saga as any).steps[0];
    const context: any = createContext();
    courierRepository.findAvailableCouriers.mockResolvedValue([
      {
        id: 'cour-2',
        name: 'Courier Two',
        phone: '+255700000002',
        vehicle: { type: 'car', capacity: { maxWeight: 50, maxVolume: 3, maxItems: 20 } },
        rating: 4.4,
        completionRate: 0.96,
        currentLocation: GeoPoint.create(-6.79, 39.2, 'Current'),
        isAvailable: true,
        trafficExperience: 0.7
      }
    ]);

    await step.execute(context, 'saga-3');

    expect(publishSpy).toHaveBeenCalledWith(
      'CourierAssigned',
      expect.objectContaining({
        estimatedArrival: new Date('2026-03-08T10:15:00.000Z')
      }),
      'req-1',
      'saga-3'
    );

    jest.useRealTimers();
  });

  it('assign_courier continues when route creation fails', async () => {
    const { saga, courierRepository, routeCreationService, publishSpy } = buildSaga();
    const step = (saga as any).steps[0];
    const context: any = createContext();
    courierRepository.findAvailableCouriers.mockResolvedValue([
      {
        id: 'cour-3',
        name: 'Courier Three',
        phone: '+255700000003',
        vehicle: { type: 'bike', capacity: { maxWeight: 20, maxVolume: 1, maxItems: 10 } },
        rating: 4.6,
        completionRate: 0.97,
        currentLocation: GeoPoint.create(-6.79, 39.2, 'Current'),
        isAvailable: true,
        trafficExperience: 0.9
      }
    ]);
    routeCreationService.createRouteForSingleDelivery.mockRejectedValue(new Error('route failed'));

    await expect(step.execute(context, 'saga-4')).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(
      '[saga-4] Failed to create route for delivery del-1:',
      expect.any(Error)
    );
    expect(publishSpy).toHaveBeenCalledWith(
      'CourierAssigned',
      expect.any(Object),
      'req-1',
      'saga-4'
    );
  });

  it('assign_courier compensation handles with and without courierId', async () => {
    const { saga, courierRepository, publishSpy } = buildSaga();
    const step = (saga as any).steps[0];
    const noCourier: any = createContext();

    await step.compensate(noCourier, 'saga-5');
    expect(courierRepository.updateCourierAvailability).not.toHaveBeenCalled();
    expect(publishSpy).toHaveBeenCalledWith(
      'Delivery.Failure.v1',
      expect.objectContaining({ reason: 'No couriers available' }),
      'req-1',
      'saga-5'
    );

    const withCourier: any = { ...createContext(), courierId: 'cour-9' };
    await step.compensate(withCourier, 'saga-6');
    expect(courierRepository.updateCourierAvailability).toHaveBeenCalledWith('cour-9', true);
    expect(withCourier.status).toBe('cancelled');
    expect(withCourier.courierId).toBeUndefined();
    expect(publishSpy).toHaveBeenCalledWith(
      'DeliveryCancelled',
      expect.objectContaining({ cancelledBy: 'system' }),
      'req-1',
      'saga-6'
    );
  });

  it('wait_for_pickup and confirm_delivery update context and emit events', async () => {
    jest.useFakeTimers();
    const { saga, publishSpy } = buildSaga();
    const waitStep = (saga as any).steps[1];
    const confirmStep = (saga as any).steps[3];
    const context: any = { ...createContext(), courierId: 'cour-1' };

    const waitPromise = waitStep.execute(context, 'saga-7');
    jest.advanceTimersByTime(2000);
    await waitPromise;
    expect(context.status).toBe('picked_up');
    expect(publishSpy).toHaveBeenCalledWith(
      'DeliveryPickedUp',
      expect.objectContaining({ courierId: 'cour-1', pickupTime: expect.any(Date) }),
      'req-1',
      'saga-7'
    );

    const confirmPromise = confirmStep.execute(context, 'saga-8');
    jest.advanceTimersByTime(1000);
    await confirmPromise;
    expect(context.status).toBe('delivered');
    expect(publishSpy).toHaveBeenCalledWith(
      'DeliveryDelivered',
      expect.objectContaining({ courierId: 'cour-1', deliveryTime: expect.any(Date) }),
      'req-1',
      'saga-8'
    );
    expect(publishSpy).toHaveBeenCalledWith(
      'Delivery.Success.v1',
      expect.objectContaining({ orderId: 'ord-1', isCOD: true }),
      'req-1',
      'saga-8'
    );

    jest.useRealTimers();
  });

  it('wait/track/confirm compensations keep expected behavior', async () => {
    const { saga, publishSpy } = buildSaga();
    const waitStep = (saga as any).steps[1];
    const trackStep = (saga as any).steps[2];
    const confirmStep = (saga as any).steps[3];
    const context: any = { ...createContext(), courierId: 'cour-1', pickedUpAt: new Date() };

    await waitStep.compensate(context, 'saga-9');
    expect(context.status).toBe('cancelled');
    expect(context.pickedUpAt).toBeUndefined();
    expect(publishSpy).toHaveBeenCalledWith(
      'DeliveryCancelled',
      expect.objectContaining({ reason: 'saga_compensation_pickup_cancelled' }),
      'req-1',
      'saga-9'
    );

    await trackStep.execute(context, 'saga-10');
    expect(context.status).toBe('in_transit');
    expect(publishSpy).toHaveBeenCalledWith(
      'DeliveryInTransit',
      expect.objectContaining({
        route: expect.objectContaining({ estimatedDuration: 45 })
      }),
      'req-1',
      'saga-10'
    );

    await trackStep.compensate(context, 'saga-11');
    expect(logSpy).toHaveBeenCalledWith(
      '[saga-11] Compensation for track_delivery: historical tracking data remains.'
    );

    await confirmStep.compensate(context, 'saga-12');
    expect(logSpy).toHaveBeenCalledWith(
      '[saga-12] Compensation for confirm_delivery: delivery completion remains.'
    );
  });
});
