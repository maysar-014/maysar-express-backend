const flush = () => new Promise<void>(resolve => setImmediate(resolve));

describe('inventory worker script', () => {
  const originalRedis = process.env.REDIS_URL;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env.REDIS_URL = 'redis://localhost:6379';
  });

  afterEach(() => {
    process.env.REDIS_URL = originalRedis;
    jest.restoreAllMocks();
  });

  it('boots dependencies, schedules intervals and registers SIGINT handler', async () => {
    const disconnect = jest.fn().mockResolvedValue(undefined);
    const PrismaClient = jest.fn(() => ({ $disconnect: disconnect }));
    const StockManager = jest.fn(() => ({}));
    const WarehouseManager = jest.fn(() => ({}));
    const ReservationEngine = jest.fn(() => ({}));
    const cleanupExpiredReservations = jest.fn().mockResolvedValue(undefined);
    const InventoryEventHandlers = jest.fn(() => ({ cleanupExpiredReservations }));
    const EventIdempotency = jest.fn(() => ({}));
    const setIntervalSpy = jest.spyOn(global, 'setInterval').mockImplementation((() => 1) as never);
    const onSpy = jest.spyOn(process, 'on');
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    jest.doMock('@prisma/client', () => ({ PrismaClient }));
    jest.doMock('@shared-events/eventBus', () => ({ eventBus: {} }), { virtual: true });
    jest.doMock('./infrastructure/redis/redis-stock-engine', () => ({
      createRedisStockEngine: jest.fn(() => ({ stockEngine: {}, redisClient: {}, redisLock: {} })),
      resolveRedisReservationMode: jest.fn(() => 'off')
    }));
    jest.doMock('./modules/stock/stockManager', () => ({ StockManager }));
    jest.doMock('./modules/warehouse/warehouseManager', () => ({ WarehouseManager }));
    jest.doMock('./modules/reservation/reservationEngine', () => ({ ReservationEngine }));
    jest.doMock('./modules/events/eventHandlers', () => ({ InventoryEventHandlers }));
    jest.doMock('@shared/middleware/idempotency', () => ({ EventIdempotency }), { virtual: true });

    require('./worker');
    await flush();

    expect(PrismaClient).toHaveBeenCalledTimes(1);
    expect(StockManager).toHaveBeenCalledTimes(1);
    expect(WarehouseManager).toHaveBeenCalledTimes(1);
    expect(ReservationEngine).toHaveBeenCalledTimes(1);
    expect(EventIdempotency).toHaveBeenCalledWith('redis://localhost:6379', expect.any(Object));
    expect(InventoryEventHandlers).toHaveBeenCalledTimes(1);
    expect(setIntervalSpy).toHaveBeenNthCalledWith(1, expect.any(Function), 5 * 60 * 1000);
    expect(setIntervalSpy).toHaveBeenNthCalledWith(2, expect.any(Function), 10 * 60 * 1000);
    expect(onSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));

    const sigintHandler = onSpy.mock.calls.find(call => call[0] === 'SIGINT')?.[1] as () => Promise<void>;
    await sigintHandler();
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});
