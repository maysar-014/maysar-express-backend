import { OptimisticLockError } from '../../../../../shared/errors/optimistic-lock.error';
import { Order, OrderStatus } from '../../domain/entities/order.entity';
import type { OrderRepository } from '../../domain/repositories/order.repository';
import { OrderRepositoryImpl } from './order.repository';

const createOrder = (): Order =>
  new Order({
    id: 'order-1',
    buyerId: 'buyer-1',
    sellerId: 'seller-1',
    items: [],
    totalAmount: 250,
    currency: 'TZS',
    totalWeight: 4,
    status: OrderStatus.PENDING,
    paymentMethod: 'cod',
    deliveryAddress: {
      street: 'Street 1',
      city: 'Dar es Salaam',
      postalCode: '11101',
      country: 'TZ'
    },
    version: 1
  });

const createPrismaMock = () => ({
  order_Order: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn()
  }
});

describe('OrderRepositoryImpl', () => {
  it('satisfies order repository contract', () => {
    const prismaMock = createPrismaMock();
    const repository: OrderRepository = new OrderRepositoryImpl(prismaMock as never);

    expect(repository).toBeInstanceOf(OrderRepositoryImpl);
  });

  it('persists orders and reads them back via finders', async () => {
    const prismaMock = createPrismaMock();
    const repository = new OrderRepositoryImpl(prismaMock as never);
    const order = createOrder();

    await repository.save(order);
    expect(prismaMock.order_Order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          id: 'order-1',
          buyerId: 'buyer-1',
          status: 'PENDING',
          paymentMethod: 'COD',
          version: 0
        })
      })
    );

    const dbRecord = {
      id: 'order-1',
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      status: 'PENDING',
      paymentMethod: 'COD',
      totalAmount: 250,
      currency: 'TZS',
      totalWeight: 4,
      deliveryAddress: {
        street: 'Street 1',
        city: 'Dar es Salaam',
        postalCode: '11101',
        country: 'TZ'
      },
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      version: 1,
      codCommitmentFee: null,
      codCommitmentPaid: false,
      codReputationScore: null,
      codEligibilityChecked: false,
      codDeliveryOtp: null,
      codOtpExpiresAt: null,
      codDeliveryConfirmedAt: null,
      codDeliveryConfirmedBy: null,
      codProofGpsLat: null,
      codProofGpsLng: null,
      codProofTimestamp: null,
      codCommitmentHoldId: null,
      items: []
    };

    prismaMock.order_Order.findUnique.mockResolvedValueOnce(dbRecord);
    prismaMock.order_Order.findMany.mockResolvedValue([dbRecord]);
    prismaMock.order_Order.count.mockResolvedValue(7);

    const byId = await repository.findById('order-1');
    const byBuyer = await repository.findByBuyerId('buyer-1');
    const byStatus = await repository.findByStatus(OrderStatus.SHIPPED);
    const count = await repository.count();

    expect(byId?.id).toBe('order-1');
    expect(byBuyer).toHaveLength(1);
    expect(byStatus).toHaveLength(1);
    expect(count).toBe(7);
    expect(prismaMock.order_Order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'IN_TRANSIT' }
      })
    );
  });

  it('throws optimistic lock error when update uses stale version', async () => {
    const prismaMock = createPrismaMock();
    prismaMock.order_Order.updateMany.mockResolvedValue({ count: 0 });
    const repository = new OrderRepositoryImpl(prismaMock as never);

    await expect(repository.update(createOrder())).rejects.toBeInstanceOf(OptimisticLockError);
  });

  it('deletes orders by id', async () => {
    const prismaMock = createPrismaMock();
    prismaMock.order_Order.delete.mockResolvedValue(undefined);
    const repository = new OrderRepositoryImpl(prismaMock as never);

    await repository.delete('order-1');

    expect(prismaMock.order_Order.delete).toHaveBeenCalledWith({
      where: { id: 'order-1' }
    });
  });
});
