const profitabilityDashboardExecuteMock = jest.fn();
const revenueHealthExecuteMock = jest.fn();
const growthExecuteMock = jest.fn();
const retentionExecuteMock = jest.fn();
const financialExecuteMock = jest.fn();
const happinessExecuteMock = jest.fn();
const detectRedFlagsMock = jest.fn();

jest.mock('../../infrastructure/repositories/SellerAnalyticsRepository', () => ({
  SellerAnalyticsRepository: jest.fn().mockImplementation(() => ({}))
}));

jest.mock('../../application/use-cases/GetSellerProfitabilityDashboard', () => ({
  GetSellerProfitabilityDashboard: jest.fn().mockImplementation(() => ({
    execute: profitabilityDashboardExecuteMock
  }))
}));

jest.mock('../../application/use-cases/GetRevenueHealthMetrics', () => ({
  GetRevenueHealthMetrics: jest.fn().mockImplementation(() => ({
    execute: revenueHealthExecuteMock
  }))
}));

jest.mock('../../application/use-cases/GetGrowthIndicators', () => ({
  GetGrowthIndicators: jest.fn().mockImplementation(() => ({
    execute: growthExecuteMock
  }))
}));

jest.mock('../../application/use-cases/GetRetentionMetrics', () => ({
  GetRetentionMetrics: jest.fn().mockImplementation(() => ({
    execute: retentionExecuteMock
  }))
}));

jest.mock('../../application/use-cases/GetFinancialMetrics', () => ({
  GetFinancialMetrics: jest.fn().mockImplementation(() => ({
    execute: financialExecuteMock
  }))
}));

jest.mock('../../application/use-cases/GetHappinessSignals', () => ({
  GetHappinessSignals: jest.fn().mockImplementation(() => ({
    execute: happinessExecuteMock
  }))
}));

jest.mock('../../domain/engines/RevenueHealthEngine', () => ({
  RevenueHealthEngine: jest.fn().mockImplementation(() => ({}))
}));
jest.mock('../../domain/engines/GrowthIndicatorsEngine', () => ({
  GrowthIndicatorsEngine: jest.fn().mockImplementation(() => ({}))
}));
jest.mock('../../domain/engines/RetentionEngine', () => ({
  RetentionEngine: jest.fn().mockImplementation(() => ({}))
}));
jest.mock('../../domain/engines/FinancialMetricsEngine', () => ({
  FinancialMetricsEngine: jest.fn().mockImplementation(() => ({}))
}));
jest.mock('../../domain/engines/SellerHappinessEngine', () => ({
  SellerHappinessEngine: jest.fn().mockImplementation(() => ({}))
}));
jest.mock('../../domain/engines/RedFlagEngine', () => ({
  RedFlagEngine: jest.fn().mockImplementation(() => ({
    detectRedFlags: detectRedFlagsMock
  }))
}));

import { AnalyticsController } from './AnalyticsControllerEnhanced';

const makeRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('AnalyticsController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns profitability dashboard and revenue health metrics', async () => {
    profitabilityDashboardExecuteMock.mockResolvedValue({ score: 88 });
    revenueHealthExecuteMock.mockResolvedValue({ medianRevenue: 400, arpsMonthly: 22 });
    const controller = new AnalyticsController();

    const dashboardReq: any = { params: { sellerId: 'seller-1' } };
    const dashboardRes = makeRes();
    await controller.getSellerProfitabilityDashboard(dashboardReq, dashboardRes);
    expect(dashboardRes.json).toHaveBeenCalledWith({ score: 88 });

    const revenueReq: any = { query: { timeWindow: 'weekly' } };
    const revenueRes = makeRes();
    await controller.getRevenueHealth(revenueReq, revenueRes);
    expect(revenueHealthExecuteMock).toHaveBeenCalledWith('weekly');
    expect(revenueRes.json).toHaveBeenCalledWith({ medianRevenue: 400, arpsMonthly: 22 });
  });

  it('returns red flags computed from aggregated metrics', async () => {
    revenueHealthExecuteMock.mockResolvedValue({ medianRevenue: 150, arpsMonthly: 9 });
    retentionExecuteMock.mockResolvedValue({ churnRateMonthly: 12, retentionRate90Days: 0.7 });
    financialExecuteMock.mockResolvedValue({ avgPayoutTimeHours: 30, disputesPer100Orders: 4 });
    growthExecuteMock.mockResolvedValue({ growthRate: 0.1 });
    detectRedFlagsMock.mockReturnValue([{ type: 'CHURN_RISK' }]);

    const controller = new AnalyticsController();
    const req: any = {};
    const res = makeRes();
    await controller.getRedFlags(req, res);

    expect(detectRedFlagsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        churnRateMonthly: 12,
        medianRevenue: 150,
        arpsMonthly: 9,
        payoutTimeHours: 30
      })
    );
    expect(res.json).toHaveBeenCalledWith({
      flags: [{ type: 'CHURN_RISK' }],
      timestamp: expect.any(Date)
    });
  });

  it('returns 500 when metrics retrieval fails', async () => {
    growthExecuteMock.mockRejectedValue(new Error('metrics-failed'));
    const controller = new AnalyticsController();
    const res = makeRes();

    await controller.getGrowthIndicators({} as any, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch growth indicators' });
  });
});

