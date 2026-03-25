const mockPrisma = {
  enabler_Commission: {
    upsert: jest.fn().mockResolvedValue(undefined),
    findMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
    findFirst: jest.fn()
  }
};

jest.mock('../database/prisma-client', () => ({
  __esModule: true,
  default: mockPrisma
}));

import { PrismaEnablerCommissionRepository } from './prisma-enabler-commission.repository';

describe('PrismaEnablerCommissionRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('upserts commission records', async () => {
    const repo = new PrismaEnablerCommissionRepository();
    const commission = {
      toPlainObject: () => ({
        id: 'enb_com_01ARZ3NDEKTSV4RRFFQ69G5FAV',
        enablerId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
        enablerOrderId: 'enb_ord_01ARZ3NDEKTSV4RRFFQ69G5FAV',
        commissionId: null,
        baseCommission: 18000,
        tierBonus: 2000,
        performanceBonus: 1000,
        totalCommission: 21000,
        status: 'pending',
        approvedBy: null,
        approvedAt: null,
        holdUntil: null,
        protectionStatus: 'active',
        fraudCheckStatus: 'pending',
        payoutId: null,
        paidAt: null,
        paymentMethod: null,
        calculationDetails: {},
        metadata: {},
        createdAt: new Date('2026-03-22T09:00:00.000Z'),
        updatedAt: new Date('2026-03-22T09:00:00.000Z')
      })
    };

    await repo.upsert(commission as any);

    expect(mockPrisma.enabler_Commission.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { enablerOrderId: 'enb_ord_01ARZ3NDEKTSV4RRFFQ69G5FAV' }
      })
    );
  });

  it('returns paginated ledger entries and aggregate summary', async () => {
    mockPrisma.enabler_Commission.findMany.mockResolvedValue([
      {
        id: 'enb_com_01ARZ3NDEKTSV4RRFFQ69G5FAV',
        enablerId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
        enablerOrderId: 'enb_ord_01ARZ3NDEKTSV4RRFFQ69G5FAV',
        commissionId: 'com_01ARZ3NDEKTSV4RRFFQ69G5FAV',
        status: 'paid',
        baseCommission: '18000',
        tierBonus: '2000',
        performanceBonus: '1000',
        totalCommission: '21000',
        protectionStatus: 'active',
        fraudCheckStatus: 'cleared',
        approvedAt: new Date('2026-03-22T10:00:00.000Z'),
        holdUntil: null,
        paidAt: new Date('2026-03-23T10:00:00.000Z'),
        payoutId: 'pyo_01ARZ3NDEKTSV4RRFFQ69G5FAV',
        paymentMethod: 'WALLET',
        createdAt: new Date('2026-03-22T09:00:00.000Z'),
        updatedAt: new Date('2026-03-23T10:00:00.000Z'),
        enablerOrder: {
          orderId: 'ord_01ARZ3NDEKTSV4RRFFQ69G5FAV'
        }
      }
    ]);
    mockPrisma.enabler_Commission.count.mockResolvedValue(1);
    mockPrisma.enabler_Commission.aggregate.mockResolvedValue({
      _sum: { totalCommission: '21000' },
      _count: { _all: 1 }
    });
    mockPrisma.enabler_Commission.groupBy.mockResolvedValue([
      {
        status: 'paid',
        _sum: { totalCommission: '21000' },
        _count: { _all: 1 }
      }
    ]);
    mockPrisma.enabler_Commission.findFirst.mockResolvedValue({
      paidAt: new Date('2026-03-23T10:00:00.000Z')
    });
    const repo = new PrismaEnablerCommissionRepository();

    const ledger = await repo.findLedgerByEnablerId('usr_01ARZ3NDEKTSV4RRFFQ69G5FAV', {
      status: 'paid',
      page: 1,
      limit: 20
    });
    const summary = await repo.getSummaryByEnablerId('usr_01ARZ3NDEKTSV4RRFFQ69G5FAV');

    expect(mockPrisma.enabler_Commission.count).toHaveBeenCalledWith({
      where: {
        enablerId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
        status: 'paid'
      }
    });
    expect(ledger.items[0].orderId).toBe('ord_01ARZ3NDEKTSV4RRFFQ69G5FAV');
    expect(ledger.items[0].totalCommission).toBe(21000);
    expect(summary.totalPaid).toBe(21000);
    expect(summary.counts.paid).toBe(1);
    expect(summary.lastPaidAt?.toISOString()).toBe('2026-03-23T10:00:00.000Z');
  });
});
