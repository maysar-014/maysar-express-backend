const prismaMock = {
  courier: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  }
};

const getClientMock = jest.fn(() => prismaMock);
const getInstanceMock = jest.fn(() => ({ getClient: getClientMock }));

jest.mock(
  '../prisma.client',
  () => ({
    PrismaClientManager: {
      getInstance: () => getInstanceMock()
    }
  }),
  { virtual: true }
);

class CourierEntityMock {
  constructor(
    public id: string,
    public name: string,
    public phone: string,
    public email: string,
    public vehicle: any,
    public status: string,
    public currentLocation: any,
    public performance: any,
    public createdAt: Date,
    public updatedAt: Date
  ) {}
}

jest.mock('../../domain/entities/courier.entity', () => ({
  CourierEntity: CourierEntityMock
}));

import { PrismaCourierRepository } from './prisma-courier.repository';

describe('PrismaCourierRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('findById returns mapped entity and null for missing courier', async () => {
    const repository = new PrismaCourierRepository();
    prismaMock.courier.findUnique.mockResolvedValueOnce({
      id: 'cour-1',
      name: 'Courier One',
      phone: '+255700000001',
      email: 'courier@example.com',
      vehicleType: 'bike',
      vehicleLicensePlate: 'AB123',
      vehicleCapacity: 10,
      vehicleFuelType: 'petrol',
      status: 'active',
      currentLatitude: -6.79,
      currentLongitude: 39.2,
      locationAccuracy: 4,
      locationTimestamp: new Date('2026-03-08T10:00:00.000Z'),
      onTimeDeliveryRate: 95,
      customerRating: 4.8,
      completedDeliveries: 200,
      totalEarnings: 300000,
      averageDeliveryTime: 28,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-03-08T11:00:00.000Z')
    });

    const found = await repository.findById('cour-1');
    expect(prismaMock.courier.findUnique).toHaveBeenCalledWith({ where: { id: 'cour-1' } });
    expect(found).toEqual(
      expect.objectContaining({
        id: 'cour-1',
        status: 'active'
      })
    );

    prismaMock.courier.findUnique.mockResolvedValueOnce(null);
    await expect(repository.findById('missing')).resolves.toBeNull();
  });

  it('findByStatus queries and maps list of couriers', async () => {
    const repository = new PrismaCourierRepository();
    prismaMock.courier.findMany.mockResolvedValue([
      {
        id: 'cour-2',
        name: 'Courier Two',
        phone: '+255700000002',
        email: 'c2@example.com',
        vehicleType: 'car',
        vehicleLicensePlate: 'CD222',
        vehicleCapacity: 30,
        vehicleFuelType: 'diesel',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    const result = await repository.findByStatus('active');

    expect(prismaMock.courier.findMany).toHaveBeenCalledWith({ where: { status: 'active' } });
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(expect.objectContaining({ id: 'cour-2', status: 'active' }));
  });

  it('findNearby filters active couriers by radius', async () => {
    const repository = new PrismaCourierRepository();
    prismaMock.courier.findMany.mockResolvedValue([
      {
        id: 'near',
        name: 'Near',
        phone: '1',
        email: 'n@example.com',
        vehicleType: 'bike',
        vehicleLicensePlate: 'N1',
        vehicleCapacity: 10,
        vehicleFuelType: 'petrol',
        status: 'active',
        currentLatitude: -6.79,
        currentLongitude: 39.2,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'far',
        name: 'Far',
        phone: '2',
        email: 'f@example.com',
        vehicleType: 'bike',
        vehicleLicensePlate: 'F1',
        vehicleCapacity: 10,
        vehicleFuelType: 'petrol',
        status: 'active',
        currentLatitude: -7.5,
        currentLongitude: 38.5,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    const result = await repository.findNearby(-6.79, 39.2, 10);

    expect(prismaMock.courier.findMany).toHaveBeenCalledWith({
      where: {
        status: 'active',
        currentLatitude: { not: null },
        currentLongitude: { not: null }
      }
    });
    expect(result.map((c: any) => c.id)).toEqual(['near']);
  });

  it('create and update map through prisma with expected payload', async () => {
    const repository = new PrismaCourierRepository();
    prismaMock.courier.create.mockResolvedValue({
      id: 'cour-3',
      name: 'Courier Three',
      phone: '+255700000003',
      email: 'c3@example.com',
      vehicleType: 'van',
      vehicleLicensePlate: 'VV3',
      vehicleCapacity: 100,
      vehicleFuelType: 'diesel',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    prismaMock.courier.update.mockResolvedValue({
      id: 'cour-3',
      name: 'Courier Three Updated',
      phone: '+255700000003',
      email: 'c3@example.com',
      vehicleType: 'van',
      vehicleLicensePlate: 'VV3',
      vehicleCapacity: 100,
      vehicleFuelType: 'diesel',
      status: 'inactive',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const created = await repository.create({
      id: 'cour-3',
      name: 'Courier Three',
      phone: '+255700000003',
      email: 'c3@example.com',
      status: 'active',
      vehicle: {
        type: 'van',
        licensePlate: 'VV3',
        capacity: 100,
        fuelType: 'diesel'
      }
    } as any);
    expect(prismaMock.courier.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          id: 'cour-3',
          vehicleType: 'van',
          vehicleLicensePlate: 'VV3'
        })
      })
    );
    expect(created).toEqual(expect.objectContaining({ id: 'cour-3' }));

    const updated = await repository.update('cour-3', { status: 'inactive' } as any);
    expect(prismaMock.courier.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cour-3' },
        data: expect.objectContaining({
          status: 'inactive',
          updatedAt: expect.any(Date)
        })
      })
    );
    expect(updated).toEqual(expect.objectContaining({ id: 'cour-3' }));
  });

  it('updateLocation and updateStatus persist timestamped updates', async () => {
    const repository = new PrismaCourierRepository();
    prismaMock.courier.update.mockResolvedValue({});

    await repository.updateLocation('cour-9', -6.8, 39.21, 3);
    expect(prismaMock.courier.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cour-9' },
        data: expect.objectContaining({
          currentLatitude: -6.8,
          currentLongitude: 39.21,
          locationAccuracy: 3,
          locationTimestamp: expect.any(Date),
          updatedAt: expect.any(Date)
        })
      })
    );

    await repository.updateStatus('cour-9', 'active');
    expect(prismaMock.courier.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cour-9' },
        data: expect.objectContaining({
          status: 'active',
          updatedAt: expect.any(Date)
        })
      })
    );
  });
});
