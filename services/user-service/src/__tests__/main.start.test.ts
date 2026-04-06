import application from '../main';
import { DatabaseConnection } from '../infrastructure/database/prisma-client';
import { logger } from '../infrastructure/services/logger.service';

describe('main start and graceful shutdown', () => {
  let origExit: any;

  beforeEach(() => {
    jest.restoreAllMocks();
    origExit = process.exit;
    process.exit = jest.fn() as any;
  });

  afterEach(() => {
    process.exit = origExit;
  });

  test('start initializes DB and registers shutdown handlers', async () => {
    const initSpy = jest.spyOn(DatabaseConnection, 'initialize').mockResolvedValue();
    const closeSpy = jest.spyOn(DatabaseConnection, 'close').mockResolvedValue();
    jest.spyOn(application.getApp(), 'listen' as any).mockImplementation((...args: any[]) => {
      const cb = args[args.length - 1];
      if (typeof cb === 'function') cb();
      return { close: () => {} } as any;
    });

    const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});

    await application.start();

    expect(initSpy).toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledWith('Saga Recovery Worker disabled by configuration');
    // simulate SIGTERM to trigger graceful shutdown
    process.emit('SIGTERM');
    // allow handlers to run
    await new Promise(r => setImmediate(r));
    expect(closeSpy).toHaveBeenCalled();
  }, 10000);
});
