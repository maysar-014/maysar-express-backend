const mockPrisma = {
  enabler_Order: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined)
  }
};

jest.mock('../database/prisma-client', () => ({
  __esModule: true,
  default: mockPrisma
}));

import { PrismaEnablerOrderRepository } from './prisma-enabler-order.repository';

describe('PrismaEnablerOrderRepository', () => {
  const makeRecord = () => ({
    id: 'eo1',
    enablerId: 'e1',
    orderId: 'o1',
    sellerId: 's1',
    buyerId: 'b1',
    productListingId: 'pl1',
    status: 'PENDING',
    orderAmount: '1000',
    productAmount: '800',
    enablerCommission: '200',
    platformFee: '0',
    commissionRate: '0.2',
    tierBonus: '0',
    performanceBonus: '0',
    settlementStatus: 'pending',
    disputeStatus: 'none',
    createdAt: new Date('2026-03-09T00:00:00.000Z'),
    updatedAt: new Date('2026-03-09T00:00:00.000Z')
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('finds and maps order records', async () => {
    mockPrisma.enabler_Order.findUnique
      .mockResolvedValueOnce(makeRecord())
      .mockResolvedValueOnce(null);
    mockPrisma.enabler_Order.findMany
      .mockResolvedValueOnce([makeRecord()])
      .mockResolvedValueOnce([makeRecord()]);
    const repo = new PrismaEnablerOrderRepository();

    const byId = await repo.findById('eo1');
    const byOrderId = await repo.findByOrderId('o1');
    const byEnabler = await repo.findByEnablerId('e1');
    const pending = await repo.findPendingCommissions();

    expect(byId?.id).toBe('eo1');
    expect(byOrderId).toBeNull();
    expect(byEnabler).toHaveLength(1);
    expect(pending).toHaveLength(1);
  });

  it('saves and updates orders from plain object payload', async () => {
    const repo = new PrismaEnablerOrderRepository();
    const order = {
      toPlainObject: () => ({
        id: 'eo1',
        enablerId: 'e1',
        orderId: 'o1',
        sellerId: 's1',
        buyerId: 'b1',
        productListingId: 'pl1',
        status: 'PENDING',
        orderAmount: 1000,
        productAmount: 800,
        enablerCommission: 200,
        commissionRate: 0.2,
        settlementStatus: 'pending',
        createdAt: new Date('2026-03-09T00:00:00.000Z'),
        updatedAt: new Date('2026-03-09T00:00:00.000Z'),
        sellerPaidAt: null,
        enablerPaidAt: null,
        disputeStatus: 'none'
      })
    };

    await repo.save(order as any);
    await repo.update(order as any);

    expect(mockPrisma.enabler_Order.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: 'eo1',
        enablerId: 'e1',
        orderId: 'o1'
      })
    });
    expect(mockPrisma.enabler_Order.update).toHaveBeenCalledWith({
      where: { id: 'eo1' },
      data: expect.objectContaining({
        status: 'PENDING',
        settlementStatus: 'pending',
        updatedAt: expect.any(Date)
      })
    });
  });
});
