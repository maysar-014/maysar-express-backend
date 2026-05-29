const mockDecimal = class {
  constructor(private readonly value: number) {}
  valueOf(): number {
    return this.value;
  }
  toString(): string {
    return String(this.value);
  }
};

jest.mock('@prisma/client', () => ({
  Prisma: {
    Decimal: mockDecimal
  }
}));

import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';
import { PrismaDeliveryRepository } from './prisma-delivery.repository';

const createDelivery = () => ({
  id: 'del-1',
  orderId: 'ord-1',
  courierId: 'cour-1',
  status: 'assigned' as const,
  pickupLocation: GeoPoint.create(-6.8, 39.2, 'Pickup Street, Dar es Salaam'),
  deliveryLocation: GeoPoint.create(-6.81, 39.21, 'Dropoff Street, Dar es Salaam'),
  estimatedPickupTime: new Date('2026-05-01T10:00:00.000Z'),
  actualPickupTime: undefined,
  estimatedDeliveryTime: new Date('2026-05-01T12:00:00.000Z'),
  actualDeliveryTime: undefined,
  weight: 2.5,
  priority: 'standard' as const,
  specialRequirements: ['fragile'],
  routeDistance: 12,
  routeDuration: 30,
  totalCost: 5000,
  isCOD: true,
  codAmount: 7000,
  codCurrency: 'TZS',
  codCollected: false,
  codCollectedAt: undefined,
  codOtpVerified: true,
  otp: '123456',
  otpExpiresAt: undefined,
  codProofGpsLat: undefined,
  codProofGpsLng: undefined,
  codProofTimestamp: undefined,
  buyerId: 'buyer-1',
  sellerId: 'seller-1',
  codCommitmentHoldId: 'hold-1',
  createdAt: new Date('2026-05-01T09:00:00.000Z'),
  updatedAt: new Date('2026-05-01T09:00:00.000Z')
});

describe('PrismaDeliveryRepository', () => {
  it('saves deliveries with normalized persistence data', async () => {
    const prisma = {
      logistics_Delivery: {
        upsert: jest.fn().mockResolvedValue(undefined),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn()
      }
    };
    const repository = new PrismaDeliveryRepository(prisma as never);
    const delivery = createDelivery();

    await repository.save(delivery as never);

    expect(prisma.logistics_Delivery.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'del-1' },
        create: expect.objectContaining({
          id: 'del-1',
          orderId: 'ord-1',
          courierId: 'cour-1',
          status: 'assigned',
          pickupStreet: 'Pickup Street, Dar es Salaam',
          deliveryStreet: 'Dropoff Street, Dar es Salaam',
          packageWeight: 2.5,
          packageValue: 5000,
          codAmount: expect.any(mockDecimal),
          isCOD: true,
          buyerId: 'buyer-1',
          sellerId: 'seller-1'
        })
      })
    );
  });

  it('maps records back to deliveries and computes stats', async () => {
    const prisma = {
      logistics_Delivery: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn()
      }
    };
    const repository = new PrismaDeliveryRepository(prisma as never);
    const baseRecord = {
      id: 'del-1',
      orderId: 'ord-1',
      courierId: 'cour-1',
      status: 'delivered',
      pickupStreet: 'Pickup Street',
      pickupCity: 'Dar',
      pickupRegion: 'TZ',
      pickupLatitude: -6.8,
      pickupLongitude: 39.2,
      deliveryStreet: 'Dropoff Street',
      deliveryCity: 'Dar',
      deliveryRegion: 'TZ',
      deliveryLatitude: -6.81,
      deliveryLongitude: 39.21,
      packageWeight: 2.5,
      packageValue: 5000,
      isCOD: true,
      codAmount: new mockDecimal(7000),
      codCurrency: 'TZS',
      codCollected: false,
      codOtpVerified: true,
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      codCommitmentHoldId: 'hold-1',
      createdAt: new Date('2026-05-01T09:00:00.000Z'),
      updatedAt: new Date('2026-05-01T09:00:00.000Z'),
      actualDeliveryTime: new Date('2026-05-01T12:10:00.000Z'),
      estimatedDeliveryTime: new Date('2026-05-01T12:00:00.000Z')
    };

    prisma.logistics_Delivery.findUnique.mockResolvedValueOnce(baseRecord);
    prisma.logistics_Delivery.findMany
      .mockResolvedValueOnce([baseRecord])
      .mockResolvedValueOnce([baseRecord])
      .mockResolvedValueOnce([
        baseRecord
      ])
      .mockResolvedValueOnce([
        {
          status: 'delivered',
          actualDeliveryTime: new Date('2026-05-01T12:10:00.000Z'),
          estimatedDeliveryTime: new Date('2026-05-01T12:00:00.000Z')
        },
        {
          status: 'assigned',
          actualDeliveryTime: null,
          estimatedDeliveryTime: null
        }
      ]);

    const found = await repository.findById('del-1');
    const byCourier = await repository.findByCourierId('cour-1');
    const byStatus = await repository.findByStatus('delivered');
    const active = await repository.findActiveDeliveries();
    const stats = await repository.getDeliveryStats({
      start: new Date('2026-05-01T00:00:00.000Z'),
      end: new Date('2026-05-02T00:00:00.000Z')
    });

    await repository.updateStatus('del-1', 'delivered', { codCollected: true });
    await repository.updateEstimatedDeliveryTime('del-1', new Date('2026-05-01T13:00:00.000Z'));

    expect(found?.id).toBe('del-1');
    expect(byCourier).toHaveLength(1);
    expect(byStatus).toHaveLength(1);
    expect(active).toHaveLength(1);
    expect(stats).toEqual({
      totalDeliveries: 2,
      completedDeliveries: 1,
      averageDeliveryTime: 10,
      onTimeDeliveryRate: 0
    });
    expect(prisma.logistics_Delivery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'del-1' },
        data: expect.objectContaining({
          status: 'delivered',
          actualDeliveryTime: expect.any(Date),
          codCollected: true
        })
      })
    );
  });
});
