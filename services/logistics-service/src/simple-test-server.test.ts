describe('simple-test-server script', () => {
  const originalPort = process.env.PORT;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env.PORT = originalPort;
  });

  it('registers endpoints and starts listening on configured port', () => {
    process.env.PORT = '4011';

    const get = jest.fn();
    const listen = jest.fn((port: number | string, callback?: () => void) => {
      callback?.();
      return { close: jest.fn() };
    });
    const app = { get, listen };
    const expressFactory = jest.fn(() => app);

    jest.doMock('express', () => ({
      __esModule: true,
      default: expressFactory
    }));

    require('./simple-test-server');

    expect(expressFactory).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith('/api/stats/performance', expect.any(Function));
    expect(get).toHaveBeenCalledWith('/health', expect.any(Function));
    expect(listen).toHaveBeenCalledWith('4011', expect.any(Function));
  });

  it('returns expected payload for performance and health handlers', () => {
    const get = jest.fn();
    const listen = jest.fn();
    const app = { get, listen };
    const expressFactory = jest.fn(() => app);
    jest.doMock('express', () => ({
      __esModule: true,
      default: expressFactory
    }));

    require('./simple-test-server');

    const performanceHandler = get.mock.calls.find(call => call[0] === '/api/stats/performance')?.[1];
    const healthHandler = get.mock.calls.find(call => call[0] === '/health')?.[1];
    const perfRes = { json: jest.fn() };
    const healthRes = { json: jest.fn() };

    performanceHandler({}, perfRes);
    healthHandler({}, healthRes);

    expect(perfRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          service: 'logistics-service'
        })
      })
    );
    expect(healthRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        service: 'logistics-service'
      })
    );
  });
});

export {};
