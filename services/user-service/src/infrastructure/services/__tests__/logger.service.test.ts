// Mock winston to avoid creating real transports/files during tests
jest.mock('winston', () => {
  const transports = {
    Console: function Console() { return {}; },
    File: function File() { return {}; }
  };

  const format = {
    combine: () => ({}),
    timestamp: () => ({}),
    errors: () => ({}),
    json: () => ({}),
    colorize: () => ({}),
    simple: () => ({})
  };

  const loggerObj = {
    exceptions: { handle: jest.fn() },
    rejections: { handle: jest.fn() },
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    child: jest.fn(() => ({})),
    transports: []
  };

  const winstonMock = {
    createLogger: jest.fn(() => loggerObj),
    transports,
    format
  };

  return {
    __esModule: true,
    default: winstonMock,
    ...winstonMock
  };
});

describe('Logger service', () => {
  test('Logger class methods exist and do not throw', () => {
    jest.resetModules();
    const { Logger } = require('../logger.service');
    const l = new Logger();
    expect(typeof l.error).toBe('function');
    expect(typeof l.warn).toBe('function');
    expect(typeof l.info).toBe('function');
    expect(typeof l.debug).toBe('function');

    // Call methods to ensure they run without throwing
    expect(() => l.error('err', { code: 123 })).not.toThrow();
    expect(() => l.warn('warn')).not.toThrow();
    expect(() => l.info('info')).not.toThrow();
    expect(() => l.debug('debug')).not.toThrow();

    // child logger
    const child = l.child({ requestId: 'r1' });
    expect(child).toBeTruthy();

    // higher-level helpers
    expect(() => l.logRequest('GET', '/x', 200, 12, 'u1')).not.toThrow();
    expect(() => l.logDatabase('INSERT', 'users', 10, true)).not.toThrow();
    expect(() => l.logBusiness('UserCreated', 'u1', { plan: 'free' })).not.toThrow();
    expect(() => l.logSecurity('LoginFail', 'u1', '1.2.3.4')).not.toThrow();
    expect(() => l.logPerformance('sync', 123)).not.toThrow();
  });

  test('exported logger singleton exists', () => {
    jest.resetModules();
    const { logger } = require('../logger.service');
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
  });
});
