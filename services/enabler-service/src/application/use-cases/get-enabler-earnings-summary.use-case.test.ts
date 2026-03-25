import { GetEnablerEarningsSummaryUseCase } from './get-enabler-earnings-summary.use-case';

describe('GetEnablerEarningsSummaryUseCase', () => {
  it('returns earnings summary for an existing enabler', async () => {
    const enablerRepository = {
      findById: jest.fn().mockResolvedValue({ id: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV' })
    };
    const commissionRepository = {
      getSummaryByEnablerId: jest.fn().mockResolvedValue({
        currency: 'TZS',
        totalCommission: 52000,
        totalPaid: 41000,
        totalPending: 5000,
        totalApproved: 6000,
        totalOnHold: 0,
        totalDisputed: 0,
        totalForfeited: 0,
        totalOutstanding: 11000,
        counts: {
          all: 4,
          pending: 1,
          approved: 1,
          paid: 2,
          onHold: 0,
          disputed: 0,
          forfeited: 0
        },
        lastPaidAt: new Date('2026-03-23T10:00:00.000Z')
      })
    };
    const useCase = new GetEnablerEarningsSummaryUseCase(
      enablerRepository as never,
      commissionRepository as never
    );

    const result = await useCase.execute('usr_01ARZ3NDEKTSV4RRFFQ69G5FAV');

    expect(result.totalOutstanding).toBe(11000);
    expect(result.lastPaidAt).toBe('2026-03-23T10:00:00.000Z');
  });

  it('throws when the enabler does not exist', async () => {
    const useCase = new GetEnablerEarningsSummaryUseCase(
      { findById: jest.fn().mockResolvedValue(null) } as never,
      {} as never
    );

    await expect(useCase.execute('missing-enabler')).rejects.toThrow('Enabler not found');
  });
});
