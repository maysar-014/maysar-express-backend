import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';
import { GetDeliveryUseCase } from './get-delivery.use-case';

describe('GetDeliveryUseCase', () => {
  const delivery = {
    id: 'del-1',
    orderId: 'ord-1',
    status: 'assigned',
    courierId: 'cour-1',
    pickupLocation: GeoPoint.create(-6.8, 39.2, 'Pickup'),
    deliveryLocation: GeoPoint.create(-6.81, 39.21, 'Dropoff'),
    estimatedPickupTime: new Date('2026-01-01T10:00:00.000Z'),
    actualPickupTime: undefined,
    estimatedDeliveryTime: new Date('2026-01-01T12:00:00.000Z'),
    actualDeliveryTime: undefined,
    weight: 3,
    priority: 'standard',
    specialRequirements: ['fragile'],
    routeDistance: 8.3,
    routeDuration: 25,
    totalCost: 12000,
    createdAt: new Date('2026-01-01T09:00:00.000Z'),
    updatedAt: new Date('2026-01-01T09:30:00.000Z')
  };

  it('returns mapped delivery details with courier info', async () => {
    const deliveryRepository = {
      findById: jest.fn().mockResolvedValue(delivery)
    };
    const courierRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'cour-1',
        name: 'Courier One',
        phone: '+255700000000',
        vehicle: { type: 'bike' }
      })
    };
    const useCase = new GetDeliveryUseCase(deliveryRepository as never, courierRepository as never);

    const result = await useCase.execute({ deliveryId: 'del-1' });

    expect(result.deliveryId).toBe('del-1');
    expect(result.courier?.name).toBe('Courier One');
    expect(result.pickupLocation.address).toBe('Pickup');
    expect(result.trackingNumber).toBe('TRKDEL-1');
  });

  it('returns null courier when courier details are missing', async () => {
    const deliveryRepository = {
      findById: jest.fn().mockResolvedValue(delivery)
    };
    const courierRepository = {
      findById: jest.fn().mockResolvedValue(null)
    };
    const useCase = new GetDeliveryUseCase(deliveryRepository as never, courierRepository as never);

    const result = await useCase.execute({ deliveryId: 'del-1' });

    expect(result.courier).toBeNull();
  });

  it('throws when delivery does not exist', async () => {
    const deliveryRepository = {
      findById: jest.fn().mockResolvedValue(null)
    };
    const courierRepository = {
      findById: jest.fn()
    };
    const useCase = new GetDeliveryUseCase(deliveryRepository as never, courierRepository as never);

    await expect(useCase.execute({ deliveryId: 'missing' })).rejects.toThrow('Delivery with ID missing not found');
  });
});
