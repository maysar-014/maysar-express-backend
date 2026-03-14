const flush = async (): Promise<void> => {
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));
};

describe('diagnose-route-engine script', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('logs successful diagnosis when route optimization works', async () => {
    const logs: string[] = [];
    jest.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      logs.push(args.join(' '));
    });
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    jest.doMock(
      './engines/route-optimization.engine',
      () => ({
        RouteOptimizationEngine: class {
          processRouteOptimization = jest.fn().mockResolvedValue({
            success: true,
            processingTime: 12,
            confidence: 93,
            optimizedRoute: {
              routeId: 'r-1',
              totalDistance: 8.2,
              totalDuration: 25
            },
            warnings: []
          });
        }
      }),
      { virtual: true }
    );

    require('./diagnose-route-engine');
    await flush();

    expect(logs.some(line => line.includes('Engine import successful'))).toBe(true);
    expect(logs.some(line => line.includes('DIAGNOSIS COMPLETE: Engine is working correctly'))).toBe(true);
  });

  it('logs validation fix guidance when engine execution throws validation error', async () => {
    const logs: string[] = [];
    jest.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      logs.push(args.join(' '));
    });
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    jest.doMock(
      './engines/route-optimization.engine',
      () => ({
        RouteOptimizationEngine: class {
          processRouteOptimization = jest
            .fn()
            .mockRejectedValue(new Error('validation failed for input payload'));
        }
      }),
      { virtual: true }
    );

    require('./diagnose-route-engine');
    await flush();

    expect(logs.some(line => line.includes('CRITICAL ERROR DETECTED'))).toBe(true);
    expect(logs.some(line => line.includes('validation failed for input payload'))).toBe(true);
    expect(logs.some(line => line.includes('Input validation failure'))).toBe(true);
  });
});

export {};

