import { PrismaCourierRepository } from './prisma-courier.repository';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';
import { DistanceCalculationAlgorithm } from '../../domain/algorithms/distance-calculation.algorithm';

const prismaMock = {
  logistics_Courier: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn()
  },
  logistics_Delivery: {
    update: jest.fn(),
    findMany: jest.fn()
  },
  logistics_LocationHistory: {
    create: jest.fn()
  },
  $transaction: jest.fn(async (ops: Array<Promise<unknown>>) => Promise.all(ops))
};

describe('PrismaCourierRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('findById returns mapped courier and null for missing', async () => {
    const repository = new PrismaCourierRepository(prismaMock as any);
    prismaMock.logistics_Courier.findUnique.mockResolvedValueOnce({
      id: 'cour-1',
      name: 'Courier One',
      phone: '+255700000001',
      vehicleType: 'bike',
      vehicleCapacity: 10,
      status: 'online',
      currentLatitude: -6.79,
      currentLongitude: 39.2,
      customerRating: 4.8,
      onTimeDeliveryRate: 0.95
    });

    const found = await repository.findById('cour-1');
    expect(prismaMock.logistics_Courier.findUnique).toHaveBeenCalledWith({ where: { id: 'cour-1' } });
    expect(found).toEqual(
      expect.objectContaining({
        id: 'cour-1',
        isAvailable: true
      })
    );

    prismaMock.logistics_Courier.findUnique.mockResolvedValueOnce(null);
    await expect(repository.findById('missing')).resolves.toBeNull();
  });

  it('findAvailable returns mapped couriers', async () => {
    const repository = new PrismaCourierRepository(prismaMock as any);
    prismaMock.logistics_Courier.findMany.mockResolvedValueOnce([
      {
        id: 'cour-2',
        name: 'Courier Two',
      phone: '+255700000002',
      vehicleType: 'car',
      vehicleCapacity: 30,
      status: 'online',
        currentLatitude: -6.79,
        currentLongitude: 39.2,
        customerRating: 4.2,
        onTimeDeliveryRate: 0.91
      }
    ]);

    const result = await repository.findAvailable();
    expect(prismaMock.logistics_Courier.findMany).toHaveBeenCalledWith({
      where: { status: 'online' }
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(expect.objectContaining({ id: 'cour-2', isAvailable: true }));
  });

  it('findAvailableCouriers filters by radius', async () => {
    const repository = new PrismaCourierRepository(prismaMock as any);
    const distanceSpy = jest
      .spyOn(DistanceCalculationAlgorithm, 'calculateDeliveryDistance')
      .mockResolvedValueOnce({ distance: 5 })
      .mockResolvedValueOnce({ distance: 20 });

    prismaMock.logistics_Courier.findMany.mockResolvedValueOnce([
      {
        id: 'near',
        name: 'Near',
        phone: '1',
        vehicleType: 'bike',
        vehicleCapacity: 10,
        status: 'online',
        currentLatitude: -6.79,
        currentLongitude: 39.2,
        customerRating: 4.5,
        onTimeDeliveryRate: 0.92
      },
      {
        id: 'far',
        name: 'Far',
        phone: '2',
        vehicleType: 'bike',
        vehicleCapacity: 10,
        status: 'online',
        currentLatitude: -7.5,
        currentLongitude: 38.5,
        customerRating: 4.5,
        onTimeDeliveryRate: 0.92
      }
    ]);

    const result = await repository.findAvailableCouriers(GeoPoint.create(-6.79, 39.2, 'A'), 10);

    expect(prismaMock.logistics_Courier.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'online'
        })
      })
    );
    expect(distanceSpy).toHaveBeenCalledTimes(1);
    expect(result.map((c) => c.id)).toEqual(['near']);
    distanceSpy.mockRestore();
  });

  it('assignCourier updates delivery and courier', async () => {
    const repository = new PrismaCourierRepository(prismaMock as any);
    prismaMock.logistics_Delivery.update.mockResolvedValueOnce({});
    prismaMock.logistics_Courier.update.mockResolvedValueOnce({});

    await repository.assignCourier('del-1', 'cour-1');

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.logistics_Delivery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'del-1' },
        data: expect.objectContaining({ courierId: 'cour-1', status: 'assigned' })
      })
    );
    expect(prismaMock.logistics_Courier.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cour-1' },
        data: expect.objectContaining({ status: 'busy' })
      })
    );
  });

  it('updateCourierLocation persists location history and coordinates', async () => {
    const repository = new PrismaCourierRepository(prismaMock as any);
    prismaMock.logistics_Courier.update.mockResolvedValueOnce({});
    prismaMock.logistics_LocationHistory.create.mockResolvedValueOnce({});

    const location = GeoPoint.create(-6.8, 39.21, 'Dar');
    await repository.updateCourierLocation('cour-9', location);

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.logistics_Courier.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cour-9' },
        data: expect.objectContaining({
          currentLatitude: -6.8,
          currentLongitude: 39.21,
          locationTimestamp: expect.any(Date)
        })
      })
    );
    expect(prismaMock.logistics_LocationHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          courierId: 'cour-9',
          latitude: -6.8,
          longitude: 39.21
        })
      })
    );
  });

  it('updateCourierAvailability updates status', async () => {
    const repository = new PrismaCourierRepository(prismaMock as any);
    prismaMock.logistics_Courier.update.mockResolvedValueOnce({});

    await repository.updateCourierAvailability('cour-9', true);
    expect(prismaMock.logistics_Courier.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cour-9' },
        data: expect.objectContaining({ status: 'online' })
      })
    );
  });

  it('getCourierPerformance aggregates deliveries and ratings', async () => {
    const repository = new PrismaCourierRepository(prismaMock as any);
    prismaMock.logistics_Delivery.findMany.mockResolvedValueOnce([
      {
        courierId: 'cour-1',
        status: 'delivered',
        actualDeliveryTime: new Date('2026-03-08T10:00:00.000Z'),
        estimatedDeliveryTime: new Date('2026-03-08T10:10:00.000Z')
      },
      {
        courierId: 'cour-1',
        status: 'delivered',
        actualDeliveryTime: new Date('2026-03-08T11:00:00.000Z'),
        estimatedDeliveryTime: new Date('2026-03-08T10:50:00.000Z')
      }
    ]);
    prismaMock.logistics_Courier.findUnique.mockResolvedValueOnce({
      customerRating: 4.6
    });

    const result = await repository.getCourierPerformance('cour-1');
    expect(result).toEqual(
      expect.objectContaining({
        totalDeliveries: 2,
        onTimeRate: 0.5,
        averageRating: 4.6
      })
    );
  });
});
