import type {
  EnablerEarningsLedgerEntryDto,
  EnablerEarningsLedgerResponseDto,
  EnablerEarningsSummaryDto,
  GetEnablerEarningsLedgerQueryDto
} from './enabler-earnings.dto';

describe('enabler-earnings DTO contracts', () => {
  it('supports ledger query payloads', () => {
    const query: GetEnablerEarningsLedgerQueryDto = {
      status: 'paid',
      page: 2,
      limit: 25
    };

    expect(query.status).toBe('paid');
    expect(query.limit).toBe(25);
  });

  it('supports earnings ledger and summary payloads', () => {
    const entry: EnablerEarningsLedgerEntryDto = {
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
      approvedAt: '2026-03-22T10:00:00.000Z',
      holdUntil: null,
      paidAt: '2026-03-23T10:00:00.000Z',
      payoutId: 'pyo_01ARZ3NDEKTSV4RRFFQ69G5FAV',
      paymentMethod: 'WALLET',
      createdAt: '2026-03-22T09:00:00.000Z',
      updatedAt: '2026-03-23T10:00:00.000Z'
    };
    const summary: EnablerEarningsSummaryDto = {
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
      lastPaidAt: '2026-03-23T10:00:00.000Z'
    };
    const response: EnablerEarningsLedgerResponseDto = {
      items: [entry],
      summary,
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1
      }
    };

    expect(response.items[0].totalCommission).toBe(21000);
    expect(response.summary.counts.paid).toBe(1);
  });
});
