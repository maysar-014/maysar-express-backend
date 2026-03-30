import { Logger } from './logger.service';

describe('Logger Service', () => {
  let logger: Logger;
  let delegate: {
    info: jest.Mock;
    error: jest.Mock;
    warn: jest.Mock;
    debug: jest.Mock;
    performance: jest.Mock;
  };

  beforeEach(() => {
    logger = new Logger();
    delegate = (logger as unknown as { delegate: typeof delegate }).delegate;
  });

  it('should log info messages', () => {
    const spy = jest.spyOn(delegate, 'info').mockImplementation();
    logger.info('Test message');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should log error messages', () => {
    const spy = jest.spyOn(delegate, 'error').mockImplementation();
    logger.error('Error message');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should log with context', () => {
    const spy = jest.spyOn(delegate, 'info').mockImplementation();
    logger.info('Message', { userId: '123' });
    expect(spy).toHaveBeenCalledWith('Message', expect.objectContaining({ userId: '123' }));
    spy.mockRestore();
  });

  it('should handle different log levels', () => {
    const debugSpy = jest.spyOn(delegate, 'debug').mockImplementation();
    const warnSpy = jest.spyOn(delegate, 'warn').mockImplementation();

    expect(() => logger.debug('Debug')).not.toThrow();
    expect(() => logger.warn('Warning')).not.toThrow();

    expect(debugSpy).toHaveBeenCalledWith('Debug', undefined);
    expect(warnSpy).toHaveBeenCalledWith('Warning', undefined);

    debugSpy.mockRestore();
    warnSpy.mockRestore();
  });
});
