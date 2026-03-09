const dashboardExecuteMock = jest.fn();
const salesTrendExecuteMock = jest.fn();
const profitabilityExecuteMock = jest.fn();

const mockPrisma = {
  analytics_SellerActionItem: {
    findMany: jest.fn(),
    update: jest.fn()
  }
};

jest.mock('../../application/use-cases/GetSellerDashboardEnhanced', () => ({
  GetSellerDashboardEnhanced: jest.fn().mockImplementation(() => ({
    execute: dashboardExecuteMock
  }))
}));

jest.mock('../../application/use-cases/GenerateSalesTrend', () => ({
  GenerateSalesTrend: jest.fn().mockImplementation(() => ({
    execute: salesTrendExecuteMock
  }))
}));

jest.mock('../../application/use-cases/CalculateProfitabilityScore', () => ({
  CalculateProfitabilityScore: jest.fn().mockImplementation(() => ({
    execute: profitabilityExecuteMock
  }))
}));

jest.mock('../../infrastructure/database/prisma', () => ({
  __esModule: true,
  default: mockPrisma
}));

import { SellerDashboardController } from './SellerDashboardController';

const makeRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('SellerDashboardController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns dashboard and money snapshot using dashboard use case', async () => {
    dashboardExecuteMock.mockResolvedValue({
      id: 'dash-1',
      moneySnapshot: { todaySales: { amount: 120 } }
    });
    const controller = new SellerDashboardController();

    const req: any = { params: { sellerId: 'seller-1' } };
    const res = makeRes();
    await controller.getSellerDashboard(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'dash-1' })
    );

    const res2 = makeRes();
    await controller.getMoneySnapshot(req, res2);
    expect(res2.json).toHaveBeenCalledWith({ todaySales: { amount: 120 } });
  });

  it('returns action center list, sales trend, profitability score and resolves actions', async () => {
    mockPrisma.analytics_SellerActionItem.findMany.mockResolvedValue([{ id: 'action-1' }]);
    mockPrisma.analytics_SellerActionItem.update.mockResolvedValue(undefined);
    salesTrendExecuteMock.mockResolvedValue({ trend: 'up', data: [] });
    profitabilityExecuteMock.mockResolvedValue({
      salesGrowth: 22.8,
      repeatBuyers: 9.2,
      responseTime: 14.6,
      orderCompletion: 18.1,
      inventoryStability: 11.5,
      total: 76
    });
    const controller = new SellerDashboardController();
    const req: any = { params: { sellerId: 'seller-1', actionId: 'action-1' } };

    const actionRes = makeRes();
    await controller.getActionCenter(req, actionRes);
    expect(actionRes.json).toHaveBeenCalledWith([{ id: 'action-1' }]);

    const trendRes = makeRes();
    await controller.getSalesTrend(req, trendRes);
    expect(trendRes.json).toHaveBeenCalledWith({ trend: 'up', data: [] });

    const scoreRes = makeRes();
    await controller.getProfitabilityScore(req, scoreRes);
    expect(scoreRes.json).toHaveBeenCalledWith({
      score: 76,
      breakdown: {
        salesGrowth: 23,
        repeatBuyers: 9,
        responseTime: 15,
        orderCompletion: 18,
        inventoryStability: 12
      }
    });

    const resolveRes = makeRes();
    await controller.resolveActionItem(req, resolveRes);
    expect(mockPrisma.analytics_SellerActionItem.update).toHaveBeenCalledWith({
      where: { id: 'action-1' },
      data: { isResolved: true }
    });
    expect(resolveRes.json).toHaveBeenCalledWith({ success: true });
  });

  it('returns 500 when a downstream operation fails', async () => {
    dashboardExecuteMock.mockRejectedValue(new Error('db-error'));
    const controller = new SellerDashboardController();

    const req: any = { params: { sellerId: 'seller-1' } };
    const res = makeRes();
    await controller.getSellerDashboard(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch dashboard' });
  });
});

