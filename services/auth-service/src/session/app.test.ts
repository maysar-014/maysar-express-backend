import { Container } from 'inversify';

const mockListen = jest.fn();
const mockUse = jest.fn();
const mockExpressApp = {
  use: mockUse,
  listen: mockListen
};

jest.mock('inversify-express-utils', () => ({
  InversifyExpressServer: jest.fn().mockImplementation(() => ({
    setConfig: (callback: (app: typeof mockExpressApp) => void) => callback(mockExpressApp),
    setErrorConfig: (callback: (app: typeof mockExpressApp) => void) => callback(mockExpressApp),
    build: () => mockExpressApp
  }))
}));

jest.mock('./infrastructure/services/logger.service', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

import { SessionServiceApplication, createServer } from './app';
import { logger } from './infrastructure/services/logger.service';

describe('SessionServiceApplication', () => {
  afterEach(() => {
    mockListen.mockReset();
    mockUse.mockReset();
    jest.restoreAllMocks();
  });

  it('creates an express app instance via constructor and factory', () => {
    const container = new Container();
    const appInstance = new SessionServiceApplication(container);
    const app = appInstance.getApp();
    const factoryApp = createServer(container);

    expect(app).toBeDefined();
    expect(typeof app.use).toBe('function');
    expect(factoryApp).toBeDefined();
    expect(typeof factoryApp.listen).toBe('function');
  });

  it('starts server and registers graceful-shutdown signal handlers', async () => {
    const container = new Container();
    const appInstance = new SessionServiceApplication(container);
    const app = appInstance.getApp();

    const loggerSpy = jest.spyOn(logger, 'info').mockImplementation(() => undefined);
    const listenSpy = jest.spyOn(app, 'listen').mockImplementation(((
      _port: number,
      callback?: () => void
    ) => {
      callback?.();
      return {} as never;
    }) as unknown as typeof app.listen);
    const processOnSpy = jest.spyOn(process, 'on').mockImplementation(((
      _event: NodeJS.Signals,
      _listener: (...args: unknown[]) => void
    ) => process) as unknown as typeof process.on);

    await appInstance.start(4100);

    expect(listenSpy).toHaveBeenCalledWith(4100, expect.any(Function));
    expect(loggerSpy).toHaveBeenCalledWith('Session Service started on port 4100');
    expect(processOnSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
    expect(processOnSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
  });
});
