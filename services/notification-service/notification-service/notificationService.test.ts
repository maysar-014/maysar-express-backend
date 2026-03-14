describe('notificationService bootstrap', () => {
  const originalPort = process.env.PORT;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env.PORT = originalPort;
  });

  it('registers handlers/routes and starts listening', () => {
    process.env.PORT = '4020';

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

    const notificationCreate = jest.fn().mockResolvedValue({});
    const notificationFindMany = jest.fn().mockResolvedValue([]);
    const prismaCtor = jest.fn(() => ({
      notification: {
        create: notificationCreate,
        findMany: notificationFindMany
      }
    }));

    const subscribe = jest.fn();
    const publish = jest.fn().mockResolvedValue(undefined);
    const tMock = jest.fn((key: string) => key);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

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
      jest.doMock('@shared/i18n/i18n', () => ({
        t: tMock
      }));

      const module = require('./notificationService');
      expect(module.default).toBe(app);
    });

    expect(jsonMiddleware).toHaveBeenCalledTimes(1);
    expect(use).toHaveBeenCalledWith('json-mw');
    expect(subscribe).toHaveBeenCalled();
    expect(post).toHaveBeenCalledWith('/api/notifications/send', expect.any(Function));
    expect(get).toHaveBeenCalledWith('/api/notifications/courier/:courierId', expect.any(Function));
    expect(listen).toHaveBeenCalledWith('4020', expect.any(Function));
    logSpy.mockRestore();
  });

  it('executes send and courier-notifications endpoints', async () => {
    const use = jest.fn();
    const get = jest.fn();
    const post = jest.fn();
    const listen = jest.fn();
    const app = { use, get, post, listen };
    const expressFactory = jest.fn(() => app);
    const jsonMiddleware = jest.fn(() => 'json-mw');
    (expressFactory as unknown as { json: typeof jsonMiddleware }).json = jsonMiddleware;

    const notificationCreate = jest.fn().mockResolvedValue({ id: 'notif-1' });
    const notificationFindMany = jest.fn().mockResolvedValue([{ id: 'notif-1' }]);
    const prismaCtor = jest.fn(() => ({
      notification: {
        create: notificationCreate,
        findMany: notificationFindMany
      }
    }));

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
        eventBus: { subscribe: jest.fn(), publish: jest.fn().mockResolvedValue(undefined) },
        EventEnvelope: class EventEnvelope {}
      }),
      { virtual: true }
    );
    jest.doMock('@shared/i18n/i18n', () => ({
      t: jest.fn((key: string) => key)
    }));

    require('./notificationService');

    const sendHandler = post.mock.calls.find(call => call[0] === '/api/notifications/send')?.[1];
    const courierHandler = get.mock.calls.find(call => call[0] === '/api/notifications/courier/:courierId')?.[1];

    const sendRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    await sendHandler({ body: { recipientId: 'courier-1' } }, sendRes);
    expect(notificationCreate).toHaveBeenCalledWith({
      data: { recipientId: 'courier-1' }
    });
    expect(sendRes.json).toHaveBeenCalledWith({ id: 'notif-1' });

    const courierRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    await courierHandler({ params: { courierId: 'courier-1' } }, courierRes);
    expect(notificationFindMany).toHaveBeenCalledWith({
      where: { userId: 'courier-1' }
    });
    expect(courierRes.json).toHaveBeenCalledWith([{ id: 'notif-1' }]);
  });
});

export {};
