import { GetEnablerEarningsLedgerUseCase } from './get-enabler-earnings-ledger.use-case';

describe('GetEnablerEarningsLedgerUseCase', () => {
  it('returns the ledger, pagination, and summary for an enabler', async () => {
    const enablerRepository = {
      findById: jest.fn().mockResolvedValue({ id: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV' })
    };
    const commissionRepository = {
      findLedgerByEnablerId: jest.fn().mockResolvedValue({
        items: [
          {
            id: 'enb_com_01ARZ3NDEKTSV4RRFFQ69G5FAV',
            enablerId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
            enablerOrderId: 'enb_ord_01ARZ3NDEKTSV4RRFFQ69G5FAV',
            orderId: 'ord_01ARZ3NDEKTSV4RRFFQ69G5FAV',
            commissionId: 'com_01ARZ3NDEKTSV4RRFFQ69G5FAV',
            status: 'paid',
            baseCommission: 18000,
            tierBonus: 2000,
            performanceBonus: 1000,
            totalCommission: 21000,
            protectionStatus: 'active',
            fraudCheckStatus: 'cleared',
            approvedAt: new Date('2026-03-22T10:00:00.000Z'),
            holdUntil: null,
            paidAt: new Date('2026-03-23T10:00:00.000Z'),
            payoutId: 'pyo_01ARZ3NDEKTSV4RRFFQ69G5FAV',
            paymentMethod: 'WALLET',
            createdAt: new Date('2026-03-22T09:00:00.000Z'),
            updatedAt: new Date('2026-03-23T10:00:00.000Z')
          }
        ],
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1
      }),
      getSummaryByEnablerId: jest.fn().mockResolvedValue({
        currency: 'TZS',
        totalCommission: 21000,
        totalPaid: 21000,
        totalPending: 0,
        totalApproved: 0,
        totalOnHold: 0,
        totalDisputed: 0,
        totalForfeited: 0,
        totalOutstanding: 0,
        counts: {
          all: 1,
          pending: 0,
          approved: 0,
          paid: 1,
          onHold: 0,
          disputed: 0,
          forfeited: 0
        },
        lastPaidAt: new Date('2026-03-23T10:00:00.000Z')
      })
    };
    const useCase = new GetEnablerEarningsLedgerUseCase(
      enablerRepository as never,
      commissionRepository as never
    );

    const result = await useCase.execute('usr_01ARZ3NDEKTSV4RRFFQ69G5FAV', {
      status: 'paid',
      page: 1,
      limit: 20
    });

    expect(commissionRepository.findLedgerByEnablerId).toHaveBeenCalledWith(
      'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
      { status: 'paid', page: 1, limit: 20 }
    );
    expect(result.items[0].paidAt).toBe('2026-03-23T10:00:00.000Z');
    expect(result.summary.totalPaid).toBe(21000);
    expect(result.pagination.totalPages).toBe(1);
  });

  it('throws when the enabler does not exist', async () => {
    const useCase = new GetEnablerEarningsLedgerUseCase(
      { findById: jest.fn().mockResolvedValue(null) } as never,
      {} as never
    );

    await expect(useCase.execute('missing-enabler')).rejects.toThrow('Enabler not found');
  });
});
