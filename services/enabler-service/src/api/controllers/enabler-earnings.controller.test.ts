import { EnablerEarningsController } from './enabler-earnings.controller';

const makeRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('EnablerEarningsController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns earnings ledger response payloads', async () => {
    const controller = new EnablerEarningsController(
      {
        execute: jest.fn().mockResolvedValue({
          items: [],
          summary: {
            currency: 'TZS',
            totalCommission: 0,
            totalPaid: 0,
            totalPending: 0,
            totalApproved: 0,
            totalOnHold: 0,
            totalDisputed: 0,
            totalForfeited: 0,
            totalOutstanding: 0,
            counts: { all: 0, pending: 0, approved: 0, paid: 0, onHold: 0, disputed: 0, forfeited: 0 },
            lastPaidAt: null
          },
          pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
        })
      } as never,
      { execute: jest.fn() } as never
    );

    const res = makeRes();
    await controller.getLedger(
      { params: { enablerId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV' }, query: { status: 'paid', page: 1, limit: 20 } } as never,
      res
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          pagination: expect.objectContaining({ total: 0 })
        })
      })
    );
  });

  it('returns earnings summary response payloads', async () => {
    const controller = new EnablerEarningsController(
      { execute: jest.fn() } as never,
      {
        execute: jest.fn().mockResolvedValue({
          currency: 'TZS',
          totalCommission: 1000,
          totalPaid: 800,
          totalPending: 200,
          totalApproved: 0,
          totalOnHold: 0,
          totalDisputed: 0,
          totalForfeited: 0,
          totalOutstanding: 200,
          counts: { all: 2, pending: 1, approved: 0, paid: 1, onHold: 0, disputed: 0, forfeited: 0 },
          lastPaidAt: '2026-03-23T10:00:00.000Z'
        })
      } as never
    );

    const res = makeRes();
    await controller.getSummary(
      { params: { enablerId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV' } } as never,
      res
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          totalPaid: 800
        })
      })
    );
  });
});
