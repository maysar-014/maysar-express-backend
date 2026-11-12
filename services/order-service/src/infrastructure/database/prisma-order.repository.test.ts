import { Order, OrderStatus } from '../../domain/entities/order.entity';
import { databaseManager } from '../../config/database.config';

const mockOrderDelegate = {
  create: jest.fn(),
  findUnique: jest.fn(),
  findMany: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn()
};

jest.mock('../../config/database.config', () => ({
  databaseManager: {
    getPrisma: jest.fn(() => ({
      order: mockOrderDelegate
    }))
  }
}));

const makeOrder = () =>
  new Order({
    id: 'order-1',
    buyerId: 'buyer-1',
    sellerId: 'seller-1',
    items: [
      {
        productId: 'product-1',
        quantity: 2,
        price: { amount: 1500, currency: 'TZS' },
        weight: 1.2
      }
    ],
    totalAmount: 3000,
    currency: 'TZS',
    totalWeight: 2.4,
    paymentMethod: 'cod',
    deliveryAddress: {
      street: 'Mlimani Road',
      city: 'Dar es Salaam',
      postalCode: '14112',
      country: 'Tanzania'
    }
  });

const makePrismaOrder = () => ({
  id: 'order-1',
  buyerId: 'buyer-1',
  sellerId: 'seller-1',
  status: 'pending',
  paymentMethod: 'cod',
  totalAmount: 3000,
  currency: 'TZS',
  totalWeight: 2.4,
  deliveryAddress: {
    street: 'Mlimani Road',
    city: 'Dar es Salaam',
    postalCode: '14112',
    country: 'Tanzania'
  },
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
  updatedAt: new Date('2025-01-01T01:00:00.000Z'),
  items: [
    {
      productId: 'product-1',
      quantity: 2,
      price: 1500,
      currency: 'TZS',
      weight: 1.2
    }
  ]
});

describe('PrismaOrderRepository', () => {
  const getPrismaMock = databaseManager.getPrisma as jest.Mock;
  const getRepositoryClass = () =>
    (jest.requireActual('./prisma-order.repository') as {
      PrismaOrderRepository: new () => {
        save(order: Order): Promise<void>;
        findById(id: string): Promise<Order | null>;
        findBySellerId(sellerId: string): Promise<Order[]>;
        update(order: Order): Promise<void>;
        delete(id: string): Promise<void>;
        findByStatus(status: OrderStatus): Promise<Order[]>;
        exists(id: string): Promise<boolean>;
        count(): Promise<number>;
      };
    }).PrismaOrderRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    getPrismaMock.mockReturnValue({ order: mockOrderDelegate });
  });

  it('saves order with items and include options', async () => {
    const PrismaOrderRepository = getRepositoryClass();
    mockOrderDelegate.create.mockResolvedValue({});
    const repo = new PrismaOrderRepository();
    const order = makeOrder();

    await expect(repo.save(order)).resolves.toBeUndefined();

    expect(mockOrderDelegate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        include: { items: true },
        data: expect.objectContaining({
          id: 'order-1',
          buyerId: 'buyer-1',
          sellerId: 'seller-1',
          totalAmount: 3000,
          items: expect.objectContaining({
            create: [
              expect.objectContaining({
                productId: 'product-1',
                quantity: 2,
                price: 1500
              })
            ]
          })
        })
      })
    );
  });

  it('persists product-scoped enabler attribution atomically with the seller order', async () => {
    const PrismaOrderRepository = getRepositoryClass();
    mockOrderDelegate.create.mockResolvedValue({});
    const repo = new PrismaOrderRepository();
    const order = makeOrder();
    order.enablerAttributionEnablerId = 'enb_01';
    order.enablerAttributionCode = 'ENB-123456';
    order.enablerAttributionProductIds = ['product-1'];

    await repo.save(order);

    const data = mockOrderDelegate.create.mock.calls[0][0].data;
    expect(data.enablerAttributions.create).toEqual([
      expect.objectContaining({
        enablerId: 'enb_01',
        customerId: 'buyer-1',
        context: 'ORDER_LINK',
        status: 'CONVERTED',
        productId: 'product-1',
        metadata: expect.objectContaining({
          source: 'enabler_purchase_link',
          enablerCode: 'ENB-123456',
          authorizationId: null,
          earningRuleType: 'PERCENTAGE_OF_ITEM_SUBTOTAL',
          earningRuleValue: 0,
          baseAmount: 0,
          commissionAmount: 0,
        }),
      }),
    ]);
    expect(data.enablerAttributions.create[0].attributionKey).toHaveLength(64);
  });

  it('maps prisma order to domain order and returns null when not found', async () => {
    const PrismaOrderRepository = getRepositoryClass();
    mockOrderDelegate.findUnique.mockResolvedValueOnce(makePrismaOrder()).mockResolvedValueOnce(null);
    const repo = new PrismaOrderRepository();

    const found = await repo.findById('order-1');
    const missing = await repo.findById('missing');

    expect(found).toBeInstanceOf(Order);
    expect(found?.id).toBe('order-1');
    expect(found?.status).toBe(OrderStatus.PENDING);
    expect(found?.items[0].price.amount).toBe(1500);
    expect(missing).toBeNull();
  });

  it('updates and deletes orders through delegate', async () => {
    const PrismaOrderRepository = getRepositoryClass();
    mockOrderDelegate.update.mockResolvedValue({});
    mockOrderDelegate.delete.mockResolvedValue({});
    const repo = new PrismaOrderRepository();
    const order = makeOrder();

    await expect(repo.update(order)).resolves.toBeUndefined();
    await expect(repo.delete(order.id)).resolves.toBeUndefined();

    expect(mockOrderDelegate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'order-1' },
        data: expect.objectContaining({
          buyerId: 'buyer-1',
          sellerId: 'seller-1'
        })
      })
    );
    expect(mockOrderDelegate.delete).toHaveBeenCalledWith({ where: { id: 'order-1' } });
  });

  it('persists processing orders as assigned because the database enum has no processing state', async () => {
    const PrismaOrderRepository = getRepositoryClass();
    mockOrderDelegate.update.mockResolvedValue({});
    const repo = new PrismaOrderRepository();
    const order = makeOrder();
    order.status = OrderStatus.PROCESSING;

    await repo.update(order);

    expect(mockOrderDelegate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'ASSIGNED' })
      })
    );
  });

  it('finds orders by status, seller, and checks existence', async () => {
    const PrismaOrderRepository = getRepositoryClass();
    mockOrderDelegate.findMany.mockResolvedValue([makePrismaOrder()]);
    mockOrderDelegate.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    const repo = new PrismaOrderRepository();

    const byStatus = await repo.findByStatus(OrderStatus.PENDING);
    const bySeller = await repo.findBySellerId('seller-1');
    const exists = await repo.exists('order-1');
    const notExists = await repo.exists('missing');

    expect(byStatus).toHaveLength(1);
    expect(byStatus[0]).toBeInstanceOf(Order);
    expect(bySeller).toHaveLength(1);
    expect(mockOrderDelegate.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { sellerId: 'seller-1' } }));
    expect(exists).toBe(true);
    expect(notExists).toBe(false);
  });

  it('throws wrapped errors and handles missing delegate gracefully', async () => {
    const PrismaOrderRepository = getRepositoryClass();
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockOrderDelegate.count.mockRejectedValueOnce(new Error('db count down'));
    const repo = new PrismaOrderRepository();

    await expect(repo.count()).rejects.toThrow('Failed to count orders: db count down');

    getPrismaMock.mockReturnValueOnce({});
    const repoWithoutDelegate = new PrismaOrderRepository();
    await expect(repoWithoutDelegate.count()).rejects.toThrow(
      'Failed to count orders: Order delegate is not configured on prisma client'
    );

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
