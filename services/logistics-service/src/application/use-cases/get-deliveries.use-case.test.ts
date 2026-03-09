import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';
import { GetDeliveriesUseCase } from './get-deliveries.use-case';

const createDelivery = (id: string, courierId: string, status: string) => ({
  id,
  orderId: `ord-${id}`,
  courierId,
  status,
  pickupLocation: GeoPoint.create(-6.79, 39.2, `Pickup ${id}`),
  deliveryLocation: GeoPoint.create(-6.8, 39.21, `Delivery ${id}`),
  estimatedPickupTime: new Date('2026-03-08T08:00:00.000Z'),
  actualPickupTime: null,
  estimatedDeliveryTime: new Date('2026-03-08T09:00:00.000Z'),
  actualDeliveryTime: null,
  weight: 3,
  priority: 'express' as const,
  specialRequirements: ['fragile'],
  routeDistance: 5,
  routeDuration: 20,
  totalCost: 8000,
  createdAt: new Date('2026-03-08T07:00:00.000Z'),
  updatedAt: new Date('2026-03-08T07:10:00.000Z')
});

describe('GetDeliveriesUseCase', () => {
  const deliveryRepository = {
    findByStatus: jest.fn(),
    findByCourierId: jest.fn(),
    findAll: jest.fn()
  };

  const courierRepository = {
    findById: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses status filter, paginates results, and maps courier details', async () => {
    const deliveries = [
      createDelivery('a1', 'cour-1', 'assigned'),
      createDelivery('a2', 'cour-2', 'assigned'),
      createDelivery('a3', 'cour-3', 'assigned')
    ];
    deliveryRepository.findByStatus.mockResolvedValue(deliveries);
    courierRepository.findById.mockResolvedValue({
      id: 'cour-1',
      name: 'Courier One',
      phone: '+255700000001',
      vehicle: { type: 'bike' }
    });

    const useCase = new GetDeliveriesUseCase(deliveryRepository as any, courierRepository as any);
    const result = await useCase.execute({ status: 'assigned', page: 1, limit: 2 });

    expect(deliveryRepository.findByStatus).toHaveBeenCalledWith('assigned');
    expect(result.total).toBe(3);
    expect(result.totalPages).toBe(2);
    expect(result.deliveries).toHaveLength(2);
    expect(result.deliveries[0]).toEqual(
      expect.objectContaining({
        deliveryId: 'a1',
        trackingNumber: 'TRKA1',
        courier: expect.objectContaining({
          id: 'cour-1',
          vehicleType: 'bike'
        })
      })
    );
  });

  it('uses courier filter and returns null courier when lookup misses', async () => {
    const deliveries = [createDelivery('b1', 'cour-x', 'picked_up')];
    deliveryRepository.findByCourierId.mockResolvedValue(deliveries);
    courierRepository.findById.mockResolvedValue(null);

    const useCase = new GetDeliveriesUseCase(deliveryRepository as any, courierRepository as any);
    const result = await useCase.execute({ courierId: 'cour-x' });

    expect(deliveryRepository.findByCourierId).toHaveBeenCalledWith('cour-x');
    expect(result.deliveries[0].courier).toBeNull();
  });

  it('uses date-range all-deliveries path and omits range when partial dates are provided', async () => {
    deliveryRepository.findAll.mockResolvedValue([createDelivery('c1', 'cour-1', 'delivered')]);
    courierRepository.findById.mockResolvedValue({
      id: 'cour-1',
      name: 'Courier',
      phone: '255',
      vehicle: {}
    });

    const useCase = new GetDeliveriesUseCase(deliveryRepository as any, courierRepository as any);
    const from = new Date('2026-03-01T00:00:00.000Z');
    const to = new Date('2026-03-31T23:59:59.999Z');
    await useCase.execute({ dateFrom: from, dateTo: to });
    expect(deliveryRepository.findAll).toHaveBeenCalledWith({ start: from, end: to });

    await useCase.execute({ dateFrom: from });
    expect(deliveryRepository.findAll).toHaveBeenLastCalledWith(undefined);
  });
});
