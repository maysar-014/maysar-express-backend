describe('logistics-api bootstrap', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('registers middleware, endpoints, and listens on service port', () => {
    const use = jest.fn();
    const get = jest.fn();
    const post = jest.fn();
    const listen = jest.fn((port: number | string, callback?: () => void) => {
      callback?.();
      return { close: jest.fn() };
    });
    const app = { use, get, post, listen };
    const expressFactory = jest.fn(() => app);
    const jsonMiddleware = jest.fn(() => 'json-mw');
    const urlencodedMiddleware = jest.fn(() => 'urlencoded-mw');
    (expressFactory as unknown as { json: typeof jsonMiddleware; urlencoded: typeof urlencodedMiddleware }).json = jsonMiddleware;
    (expressFactory as unknown as { json: typeof jsonMiddleware; urlencoded: typeof urlencodedMiddleware }).urlencoded =
      urlencodedMiddleware;
    const corsFactory = jest.fn(() => 'cors-mw');
    const processLogisticsRequest = jest.fn().mockResolvedValue({ deliveryId: 'd-1', shippingCost: 5000 });
    const logisticsEngineCtor = jest.fn(() => ({ processLogisticsRequest }));
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    jest.doMock('express', () => ({
      __esModule: true,
      default: expressFactory
    }));
    jest.doMock('cors', () => ({
      __esModule: true,
      default: corsFactory
    }));
    jest.doMock(
      './engines/logistics.engine',
      () => ({
        LogisticsEngine: logisticsEngineCtor
      }),
      { virtual: true }
    );

    require('./logistics-api');

    expect(expressFactory).toHaveBeenCalledTimes(1);
    expect(corsFactory).toHaveBeenCalledTimes(1);
    expect(jsonMiddleware).toHaveBeenCalledWith({ limit: '10mb' });
    expect(urlencodedMiddleware).toHaveBeenCalledWith({ extended: true });
    expect(use).toHaveBeenCalledWith('cors-mw');
    expect(use).toHaveBeenCalledWith('json-mw');
    expect(use).toHaveBeenCalledWith('urlencoded-mw');
    expect(get).toHaveBeenCalledWith('/health', expect.any(Function));
    expect(post).toHaveBeenCalledWith('/api/v1/logistics/calculate', expect.any(Function));
    expect(listen).toHaveBeenCalledWith(3008, expect.any(Function));
    logSpy.mockRestore();
  });

  it('handles calculate endpoint success and error branches', async () => {
    const use = jest.fn();
    const get = jest.fn();
    const post = jest.fn();
    const listen = jest.fn();
    const app = { use, get, post, listen };
    const expressFactory = jest.fn(() => app);
    const jsonMiddleware = jest.fn(() => 'json-mw');
    const urlencodedMiddleware = jest.fn(() => 'urlencoded-mw');
    (expressFactory as unknown as { json: typeof jsonMiddleware; urlencoded: typeof urlencodedMiddleware }).json = jsonMiddleware;
    (expressFactory as unknown as { json: typeof jsonMiddleware; urlencoded: typeof urlencodedMiddleware }).urlencoded =
      urlencodedMiddleware;
    const processLogisticsRequest = jest.fn();
    const logisticsEngineCtor = jest.fn(() => ({ processLogisticsRequest }));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    jest.doMock('express', () => ({
      __esModule: true,
      default: expressFactory
    }));
    jest.doMock('cors', () => ({
      __esModule: true,
      default: jest.fn(() => 'cors-mw')
    }));
    jest.doMock(
      './engines/logistics.engine',
      () => ({
        LogisticsEngine: logisticsEngineCtor
      }),
      { virtual: true }
    );

    require('./logistics-api');

    const calculateHandler = post.mock.calls.find(call => call[0] === '/api/v1/logistics/calculate')?.[1];
    const successRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    processLogisticsRequest.mockResolvedValueOnce({ deliveryId: 'd-2', shippingCost: 7000 });
    await calculateHandler({ body: { orderId: 'order-1' } }, successRes);
    expect(processLogisticsRequest).toHaveBeenCalledWith({ orderId: 'order-1' });
    expect(successRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          deliveryId: 'd-2',
          shippingCost: 7000
        })
      })
    );

    const errorRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    processLogisticsRequest.mockRejectedValueOnce(new Error('calculation failed'));
    await calculateHandler({ body: { orderId: 'order-2' } }, errorRes);
    expect(errorRes.status).toHaveBeenCalledWith(500);
    expect(errorRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'LOGISTICS_ERROR',
          message: 'calculation failed'
        })
      })
    );
    errorSpy.mockRestore();
  });

  it('returns sample test payload from test endpoint', async () => {
    const use = jest.fn();
    const get = jest.fn();
    const post = jest.fn();
    const listen = jest.fn();
    const app = { use, get, post, listen };
    const expressFactory = jest.fn(() => app);
    const jsonMiddleware = jest.fn(() => 'json-mw');
    const urlencodedMiddleware = jest.fn(() => 'urlencoded-mw');
    (expressFactory as unknown as { json: typeof jsonMiddleware; urlencoded: typeof urlencodedMiddleware }).json = jsonMiddleware;
    (expressFactory as unknown as { json: typeof jsonMiddleware; urlencoded: typeof urlencodedMiddleware }).urlencoded =
      urlencodedMiddleware;
    const processLogisticsRequest = jest.fn().mockResolvedValue({ deliveryId: 'test-delivery', shippingCost: 1000 });
    const logisticsEngineCtor = jest.fn(() => ({ processLogisticsRequest }));

    jest.doMock('express', () => ({
      __esModule: true,
      default: expressFactory
    }));
    jest.doMock('cors', () => ({
      __esModule: true,
      default: jest.fn(() => 'cors-mw')
    }));
    jest.doMock(
      './engines/logistics.engine',
      () => ({
        LogisticsEngine: logisticsEngineCtor
      }),
      { virtual: true }
    );

    require('./logistics-api');

    const testHandler = get.mock.calls.find(call => call[0] === '/api/v1/logistics/test')?.[1];
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    await testHandler({}, res);

    expect(processLogisticsRequest).toHaveBeenCalledWith(expect.objectContaining({ orderId: 'api_test_001' }));
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: 'Logistics API is working!',
        testResult: expect.objectContaining({
          deliveryId: 'test-delivery',
          shippingCost: 1000
        })
      })
    );
  });
});

export {};
