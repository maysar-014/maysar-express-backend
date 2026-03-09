import type { Request, Response } from 'express';

jest.mock('../../infrastructure/monitoring', () => ({
  getHealthCheckData: jest.fn().mockResolvedValue({}),
  getDetailedMetrics: jest.fn().mockResolvedValue({})
}));

jest.mock('../../infrastructure/architectural-analysis', () => ({
  ArchitecturalAnalysisEngine: jest.fn().mockImplementation(() => ({
    analyze: jest.fn().mockResolvedValue({ constitutionCompliance: {} })
  }))
}));

jest.mock('../../infrastructure/performance-benchmarks', () => ({
  PerformanceBenchmarkEngine: jest.fn().mockImplementation(() => ({
    runFullBenchmarkSuite: jest.fn().mockResolvedValue({ summary: { successRate: 1 } }),
    runLoadTest: jest.fn().mockResolvedValue({})
  }))
}));

jest.mock('../../infrastructure/security-audit', () => ({
  SecurityAuditEngine: jest.fn().mockImplementation(() => ({
    performFullSecurityAudit: jest.fn().mockResolvedValue({ summary: { complianceScore: 100 } })
  }))
}));

import { TestController } from './test.controller';

const createResponse = (): Response => {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
  return response as unknown as Response;
};

function createController(): TestController {
  return new TestController(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never
  );
}

describe('TestController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('aggregates all engine checks and reports healthy summary', async () => {
    const controller = createController() as unknown as Record<string, jest.Mock>;
    controller.testLogisticsEngine = jest.fn().mockResolvedValue({ ok: true });
    controller.testRouteOptimization = jest.fn().mockResolvedValue({ ok: true });
    controller.testRealTimeTracking = jest.fn().mockResolvedValue({ ok: true });
    controller.testDeliveryHistory = jest.fn().mockResolvedValue({ ok: true });
    controller.testEarningsCalculation = jest.fn().mockResolvedValue({ ok: true });
    controller.testPerformanceAnalytics = jest.fn().mockResolvedValue({ ok: true });
    controller.testInfrastructure = jest.fn().mockResolvedValue({ ok: true });

    const req = {} as Request;
    const res = createResponse();

    await (controller as unknown as TestController).testAllEngines(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          summary: expect.objectContaining({
            totalTests: 7,
            successfulTests: 7,
            systemHealth: 'healthy'
          })
        })
      })
    );
  });

  it('reports degraded status when one engine test fails', async () => {
    const controller = createController() as unknown as Record<string, jest.Mock>;
    controller.testLogisticsEngine = jest.fn().mockResolvedValue({ ok: true });
    controller.testRouteOptimization = jest.fn().mockRejectedValue(new Error('route failure'));
    controller.testRealTimeTracking = jest.fn().mockResolvedValue({ ok: true });
    controller.testDeliveryHistory = jest.fn().mockResolvedValue({ ok: true });
    controller.testEarningsCalculation = jest.fn().mockResolvedValue({ ok: true });
    controller.testPerformanceAnalytics = jest.fn().mockResolvedValue({ ok: true });
    controller.testInfrastructure = jest.fn().mockResolvedValue({ ok: true });

    const req = {} as Request;
    const res = createResponse();

    await (controller as unknown as TestController).testAllEngines(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          summary: expect.objectContaining({
            failedTests: 1,
            systemHealth: 'degraded'
          })
        })
      })
    );
  });
});
