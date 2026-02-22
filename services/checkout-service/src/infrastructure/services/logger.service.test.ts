import { Logger } from './logger.service';

describe('Logger Service', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger('test-service');
  });

  it('should log info messages', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation();
    logger.info('Test message');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should log error messages', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation();
    logger.error('Error message');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should log with context', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation();
    logger.info('Message', { userId: '123' });
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('userId'));
    spy.mockRestore();
  });

  it('should handle different log levels', () => {
    expect(() => logger.debug('Debug')).not.toThrow();
    expect(() => logger.warn('Warning')).not.toThrow();
  });
});
