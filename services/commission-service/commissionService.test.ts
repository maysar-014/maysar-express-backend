describe('commissionService bootstrap', () => {
  const originalPort = process.env.PORT;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env.PORT = originalPort;
  });

  it('wires event subscriptions/routes and starts listening', () => {
    process.env.PORT = '4308';

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

    const commissionFindMany = jest.fn().mockResolvedValue([]);
    const commissionCreate = jest.fn().mockResolvedValue({});
    const payoutCreate = jest.fn().mockResolvedValue({});
    const prismaCtor = jest.fn(() => ({
      commission: {
        findMany: commissionFindMany,
        create: commissionCreate
      },
      payout: {
        create: payoutCreate
      }
    }));

    const subscribe = jest.fn();
    const publish = jest.fn().mockResolvedValue(undefined);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    jest.isolateModules(() => {
      jest.doMock('express', () => ({
        __esModule: true,
        default: expressFactory
      }));
      jest.doMock('@prisma/client', () => ({
        PrismaClient: prismaCtor
      }));
      jest.doMock('../../shared/events/eventBus', () => ({
        eventBus: { subscribe, publish },
        EventEnvelope: class EventEnvelope {}
      }));

      const module = require('./commissionService');
      expect(module.default).toBe(app);
    });

    expect(jsonMiddleware).toHaveBeenCalledTimes(1);
    expect(use).toHaveBeenCalledWith('json-mw');
    expect(subscribe).toHaveBeenCalled();
    expect(get).toHaveBeenCalledWith('/api/commissions/courier/:courierId', expect.any(Function));
    expect(post).toHaveBeenCalledWith('/api/payouts/request', expect.any(Function));
    expect(listen).toHaveBeenCalledWith('4308', expect.any(Function));
    logSpy.mockRestore();
  });

  it('handles commission lookup and payout request endpoints', async () => {
    const use = jest.fn();
    const get = jest.fn();
    const post = jest.fn();
    const listen = jest.fn();
    const app = { use, get, post, listen };
    const expressFactory = jest.fn(() => app);
    const jsonMiddleware = jest.fn(() => 'json-mw');
    (expressFactory as unknown as { json: typeof jsonMiddleware }).json = jsonMiddleware;

    const commissionFindMany = jest.fn().mockResolvedValue([{ id: 'c-1', amount: 100 }]);
    const payoutCreate = jest.fn().mockResolvedValue({ id: 'p-1', amount: 100 });
    const prismaCtor = jest.fn(() => ({
      commission: {
        findMany: commissionFindMany,
        create: jest.fn().mockResolvedValue({})
      },
      payout: {
        create: payoutCreate
      }
    }));

    jest.doMock('express', () => ({
      __esModule: true,
      default: expressFactory
    }));
    jest.doMock('@prisma/client', () => ({
      PrismaClient: prismaCtor
    }));
    jest.doMock('../../shared/events/eventBus', () => ({
      eventBus: { subscribe: jest.fn(), publish: jest.fn().mockResolvedValue(undefined) },
      EventEnvelope: class EventEnvelope {}
    }));

    require('./commissionService');

    const listHandler = get.mock.calls.find(call => call[0] === '/api/commissions/courier/:courierId')?.[1];
    const payoutHandler = post.mock.calls.find(call => call[0] === '/api/payouts/request')?.[1];

    const listRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    await listHandler({ params: { courierId: 'courier-1' } }, listRes);
    expect(commissionFindMany).toHaveBeenCalledWith({
      where: { recipientId: 'courier-1', recipientType: 'courier' }
    });
    expect(listRes.json).toHaveBeenCalledWith([{ id: 'c-1', amount: 100 }]);

    const payoutRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    await payoutHandler({ body: { courierId: 'courier-1', amount: 100 } }, payoutRes);
    expect(payoutCreate).toHaveBeenCalledWith({
      data: { courierId: 'courier-1', amount: 100 }
    });
    expect(payoutRes.json).toHaveBeenCalledWith({ id: 'p-1', amount: 100 });
  });
});

export {};

