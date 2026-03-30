import { Request, Response } from 'express';
import { SellerSlaController } from '../SellerSlaController';
import type { SellerSlaExecutionResultDTO, SellerSlaReport } from '../../../application/dto/seller-sla.dto';

const executeMock = jest.fn();

const makeRes = (): Response => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  } as unknown as Response;

  return res;
};

const buildReport = (): SellerSlaReport => ({
  sellerId: 'seller-1',
  evaluatedAt: new Date('2026-03-31T12:00:00.000Z'),
  periodStart: new Date('2026-03-01T00:00:00.000Z'),
  periodEnd: new Date('2026-03-31T12:00:00.000Z'),
  overallComplianceScore: 91,
  goLiveReadinessScore: 88,
  dataCoverageScore: 100,
  status: 'manual',
  summary: {
    totalMetrics: 12,
    compliantMetrics: 9,
    atRiskMetrics: 1,
    breachedMetrics: 0,
    manualMetrics: 2,
    totalReadinessGates: 7,
    passedReadinessGates: 3,
    failedReadinessGates: 1,
    manualReadinessGates: 3
  },
  metrics: [],
  breaches: [],
  readiness: [],
  coverage: [],
  recommendations: ['Keep monitoring']
});

describe('SellerSlaController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the report payload and passes lookback days to the use case', async () => {
    const controller = new SellerSlaController({ execute: executeMock });
    const report = buildReport();
    executeMock.mockResolvedValue({ report });

    const req = {
      params: { sellerId: 'seller-1' },
      query: { lookbackDays: '14' }
    } as unknown as Request;
    const res = makeRes();

    await controller.getSellerSla(req, res);

    expect(executeMock).toHaveBeenCalledWith('seller-1', { lookbackDays: 14, mode: 'report' });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      sellerId: 'seller-1',
      status: 'manual',
      summary: report.summary
    }));
  });

  it('returns a focused breaches view', async () => {
    const controller = new SellerSlaController({ execute: executeMock });
    const report = buildReport();
    executeMock.mockResolvedValue({ report });

    const req = {
      params: { sellerId: 'seller-1' },
      query: {}
    } as unknown as Request;
    const res = makeRes();

    await controller.getSellerSlaBreaches(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      sellerId: 'seller-1',
      breaches: []
    }));
  });

  it('evaluates and returns persistence metadata', async () => {
    const controller = new SellerSlaController({ execute: executeMock });
    const report = buildReport();
    const persistence: SellerSlaExecutionResultDTO['persistence'] = {
      actionItemsUpserted: 2,
      actionItemsResolved: 1,
      eventId: 'event-1'
    };
    executeMock.mockResolvedValue({ report, persistence });

    const req = {
      params: { sellerId: 'seller-1' },
      body: { lookbackDays: '7' }
    } as unknown as Request;
    const res = makeRes();

    await controller.evaluateSellerSla(req, res);

    expect(executeMock).toHaveBeenCalledWith('seller-1', { lookbackDays: 7, mode: 'evaluate' });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      report: expect.objectContaining({
        sellerId: 'seller-1'
      }),
      persistence
    }));
  });
});
