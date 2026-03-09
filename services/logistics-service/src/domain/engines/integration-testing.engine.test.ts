import { IntegrationTestingSuite } from './integration-testing.engine';

describe('IntegrationTestingSuite', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('aggregates load testing output across endpoints', async () => {
    const suite = new IntegrationTestingSuite();
    jest
      .spyOn(
        suite as unknown as {
          loadTestEndpoint: (endpoint: string, requests: number, concurrency: number) => Promise<{
            totalRequests: number;
            successfulRequests: number;
            failedRequests: number;
            averageResponseTime: number;
            maxResponseTime: number;
            requestsPerSecond: number;
            errorRate: number;
          }>;
        },
        'loadTestEndpoint'
      )
      .mockResolvedValue({
        totalRequests: 166.6667,
        successfulRequests: 160,
        failedRequests: 6.6667,
        averageResponseTime: 20,
        maxResponseTime: 40,
        requestsPerSecond: 100,
        errorRate: 4
      });

    const result = await suite.performLoadTesting();

    expect(result.totalRequests).toBeCloseTo(1000.0002, 3);
    expect(result.successfulRequests).toBe(960);
    expect(result.failedRequests).toBeCloseTo(40.0002, 3);
    expect(result.averageResponseTime).toBe(20);
    expect(result.maxResponseTime).toBe(40);
    expect(result.requestsPerSecond).toBe(100);
  });

  it('validates api compliance and records failures', async () => {
    const suite = new IntegrationTestingSuite();
    const endpointSpy = jest
      .spyOn(
        suite as unknown as {
          testEndpoint: (method: string, path: string, expectedStatus: number) => Promise<{ success: boolean }>;
        },
        'testEndpoint'
      )
      .mockImplementation(async (_method, path) => ({ success: !path.includes('/ml/anomaly-detection') }));

    const result = await suite.validateAPICompliance();

    expect(endpointSpy).toHaveBeenCalledTimes(26);
    expect(result.totalEndpoints).toBe(26);
    expect(result.passedTests).toBe(25);
    expect(result.failedTests).toBe(1);
    expect(result.failedEndpoints).toContain('GET /api/courier/ml/anomaly-detection');
  });

  it('benchmarks each configured engine', async () => {
    const suite = new IntegrationTestingSuite();
    jest
      .spyOn(
        suite as unknown as {
          benchmarkEngine: (engineName: string, endpoint: string) => Promise<{
            engine: string;
            accuracy: number;
            responseTime: number;
            throughput: number;
            memoryUsage: number;
            cpuUsage: number;
            score: number;
          }>;
        },
        'benchmarkEngine'
      )
      .mockImplementation(async engineName => ({
        engine: engineName,
        accuracy: 90,
        responseTime: 20,
        throughput: 50,
        memoryUsage: 40,
        cpuUsage: 20,
        score: 88
      }));

    const result = await suite.benchmarkPerformance();

    expect(result).toHaveLength(6);
    expect(result[0]?.engine).toBe('logistics-engine');
    expect(result[5]?.engine).toBe('ml-optimization-engine');
  });

  it('verifies data accuracy across configured engines', async () => {
    const suite = new IntegrationTestingSuite();
    jest
      .spyOn(
        suite as unknown as {
          testEngineAccuracy: (engineName: string, testCases: number) => Promise<{ accuracy: number; passed: number; failed: number }>;
        },
        'testEngineAccuracy'
      )
      .mockResolvedValue({ accuracy: 92, passed: 92, failed: 8 });

    const result = await suite.verifyDataAccuracy();

    expect(result).toHaveLength(5);
    expect(result[0]).toEqual(
      expect.objectContaining({
        engine: 'route-optimization',
        actualAccuracy: 92
      })
    );
  });

  it('makeRequest returns successful payload when fetch resolves', async () => {
    const suite = new IntegrationTestingSuite();
    (global as unknown as { fetch: jest.Mock }).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ ok: true })
    });

    const result = await (
      suite as unknown as {
        makeRequest: (endpoint: string) => Promise<{ success: boolean; status: number; data: unknown; responseTime: number }>;
      }
    ).makeRequest('/health');

    expect(result.success).toBe(true);
    expect(result.status).toBe(200);
    expect(result.data).toEqual({ ok: true });
    expect(result.responseTime).toBeGreaterThanOrEqual(0);
  });

  it('makeRequest returns failure payload when fetch throws', async () => {
    const suite = new IntegrationTestingSuite();
    (global as unknown as { fetch: jest.Mock }).fetch = jest.fn().mockRejectedValue(new Error('network down'));

    const result = await (
      suite as unknown as {
        makeRequest: (endpoint: string) => Promise<{ success: boolean; error: string; responseTime: number }>;
      }
    ).makeRequest('/health');

    expect(result.success).toBe(false);
    expect(result.error).toBe('network down');
    expect(result.responseTime).toBeGreaterThanOrEqual(0);
  });

  it('testEndpoint posts payload and validates expected status', async () => {
    const suite = new IntegrationTestingSuite();
    const fetchMock = jest.fn().mockResolvedValue({
      status: 200,
      json: jest.fn().mockResolvedValue({ ok: true })
    });
    (global as unknown as { fetch: jest.Mock }).fetch = fetchMock;

    const result = await (
      suite as unknown as {
        testEndpoint: (
          method: string,
          path: string,
          expectedStatus: number
        ) => Promise<{ success: boolean; status: number; expected: number }>;
      }
    ).testEndpoint('POST', '/api/courier/earnings/payout', 200);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3007/api/courier/earnings/payout',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ courierId: 'test_courier', test: true })
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        status: 200,
        expected: 200
      })
    );
  });

  it('benchmarkEngine computes deterministic metrics with mocked dependencies', async () => {
    const suite = new IntegrationTestingSuite();
    jest
      .spyOn(
        suite as unknown as {
          makeRequest: (endpoint: string) => Promise<{ success: boolean; responseTime: number }>;
        },
        'makeRequest'
      )
      .mockResolvedValue({ success: true, responseTime: 20 });
    jest
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0.1)
      .mockReturnValueOnce(0.2)
      .mockReturnValueOnce(0.3);

    const result = await (
      suite as unknown as {
        benchmarkEngine: (engineName: string, endpoint: string) => Promise<{
          engine: string;
          accuracy: number;
          responseTime: number;
          throughput: number;
          memoryUsage: number;
          cpuUsage: number;
          score: number;
        }>;
      }
    ).benchmarkEngine('engine-a', '/health');

    expect(result.engine).toBe('engine-a');
    expect(result.responseTime).toBe(20);
    expect(result.throughput).toBe(50);
    expect(result.memoryUsage).toBeCloseTo(30);
    expect(result.cpuUsage).toBeCloseTo(20);
    expect(result.accuracy).toBeCloseTo(88);
    expect(result.score).toBe(66);
  });

  it('builds comprehensive report using aggregated subsystems', async () => {
    const suite = new IntegrationTestingSuite();
    jest.spyOn(suite, 'performLoadTesting').mockResolvedValue({
      totalRequests: 1000,
      successfulRequests: 980,
      failedRequests: 20,
      averageResponseTime: 25,
      maxResponseTime: 70,
      requestsPerSecond: 110,
      errorRate: 2
    });
    jest.spyOn(suite, 'validateAPICompliance').mockResolvedValue({
      totalEndpoints: 26,
      testedEndpoints: 26,
      passedTests: 25,
      failedTests: 1,
      complianceScore: 96.15,
      failedEndpoints: ['GET /bad']
    });
    jest.spyOn(suite, 'benchmarkPerformance').mockResolvedValue([
      {
        engine: 'logistics-engine',
        accuracy: 90,
        responseTime: 20,
        throughput: 50,
        memoryUsage: 40,
        cpuUsage: 20,
        score: 85
      }
    ]);
    jest.spyOn(suite, 'verifyDataAccuracy').mockResolvedValue([
      {
        engine: 'route-optimization',
        expectedAccuracy: 88,
        actualAccuracy: 92,
        testCases: 100,
        passedCases: 92,
        failedCases: 8
      }
    ]);

    const report = await suite.generateTestReport();

    expect(report).toContain('MAYSAR EXPRESS BACKEND - COMPREHENSIVE TEST REPORT');
    expect(report).toContain('Total Requests: 1000');
    expect(report).toContain('Compliance Score: 96.2%');
    expect(report).toContain('logistics-engine: 85/100');
    expect(report).toContain('route-optimization: 92.0%');
    expect(report).toContain('OVERALL SYSTEM HEALTH: 94%');
  });
});
