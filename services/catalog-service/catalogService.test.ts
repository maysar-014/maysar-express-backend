describe('catalogService bootstrap', () => {
  const originalPort = process.env.PORT;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env.PORT = originalPort;
  });

  it('initializes search dependencies, subscribes events, and starts listening', async () => {
    process.env.PORT = '4105';

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
    (expressFactory as unknown as { json: typeof jsonMiddleware }).json = jsonMiddleware;

    const prisma = {
      product: { create: jest.fn(), findUnique: jest.fn() },
      productVariant: { updateMany: jest.fn(), findMany: jest.fn(), update: jest.fn() },
      wholesalePricing: { findMany: jest.fn(), create: jest.fn(), upsert: jest.fn() }
    };
    const prismaCtor = jest.fn(() => prisma);

    const subscribe = jest.fn();
    const publish = jest.fn().mockResolvedValue(undefined);
    const initialize = jest.fn().mockResolvedValue({
      searchEngine: { searchProducts: jest.fn() },
      indexManager: { rebuildIndex: jest.fn() }
    });
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    jest.isolateModules(() => {
      jest.doMock('express', () => ({
        __esModule: true,
        default: expressFactory
      }));
      jest.doMock('@prisma/client', () => ({
        PrismaClient: prismaCtor
      }));
      jest.doMock(
        '@shared-events/eventBus',
        () => ({
          eventBus: { subscribe, publish },
          EventEnvelope: class EventEnvelope {}
        }),
        { virtual: true }
      );
      jest.doMock('dotenv', () => ({
        __esModule: true,
        default: { config: jest.fn() }
      }));
      jest.doMock('uuid', () => ({
        v4: jest.fn(() => 'uuid-1')
      }));
      jest.doMock('./src/infrastructure/search-initializer', () => ({
        SearchEngineInitializer: { initialize }
      }));

      const module = require('./catalogService');
      expect(module.default).toBe(app);
    });

    await new Promise(resolve => setImmediate(resolve));

    expect(prismaCtor).toHaveBeenCalledTimes(1);
    expect(jsonMiddleware).toHaveBeenCalledTimes(1);
    expect(use).toHaveBeenCalledWith('json-mw');
    expect(initialize).toHaveBeenCalledWith(prisma);
    expect(subscribe).toHaveBeenCalled();
    expect(post).toHaveBeenCalledWith('/api/products', expect.any(Function));
    expect(get).toHaveBeenCalledWith('/api/products/:id', expect.any(Function));
    expect(listen).toHaveBeenCalledWith('4105', expect.any(Function));
    expect(exitSpy).not.toHaveBeenCalled();

    logSpy.mockRestore();
    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });
});

export {};
