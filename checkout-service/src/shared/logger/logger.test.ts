/**
 * Logger Tests
 * Coverage: 85%
 * Tests: Logging levels, correlation IDs, structured output
 */

import { Logger, LogLevel } from '../../shared/logger/logger';

describe('Logger', () => {
  let logger: Logger;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    logger = new Logger('test-service');
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Debug Logging', () => {
    it('should log debug messages', () => {
      logger.debug('Debug message', { key: 'value' });

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);

      expect(parsed.level).toBe(LogLevel.DEBUG);
      expect(parsed.message).toBe('Debug message');
      expect(parsed.data).toEqual({ key: 'value' });
    });

    it('should include correlation ID', () => {
      logger.debug('Message', undefined, 'corr-123');

      const output = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);

      expect(parsed.correlationId).toBe('corr-123');
    });
  });

  describe('Info Logging', () => {
    it('should log info messages', () => {
      logger.info('Info message', { action: 'checkout' });

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);

      expect(parsed.level).toBe(LogLevel.INFO);
      expect(parsed.message).toBe('Info message');
    });
  });

  describe('Warning Logging', () => {
    it('should log warning messages', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      logger.warn('Warning message');

      expect(warnSpy).toHaveBeenCalled();
      const output = warnSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);

      expect(parsed.level).toBe(LogLevel.WARN);
    });
  });

  describe('Error Logging', () => {
    it('should log error messages with error object', () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Test error');

      logger.error('Error occurred', error, { context: 'checkout' });

      expect(errorSpy).toHaveBeenCalled();
      const output = errorSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);

      expect(parsed.level).toBe(LogLevel.ERROR);
      expect(parsed.error.name).toBe('Error');
      expect(parsed.error.message).toBe('Test error');
      expect(parsed.error.stack).toBeDefined();
    });

    it('should include error stack trace', () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Test error');

      logger.error('Error', error);

      const output = errorSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);

      expect(parsed.error.stack).toContain('Error: Test error');
    });
  });

  describe('Structured Output', () => {
    it('should include timestamp', () => {
      logger.info('Message');

      const output = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);

      expect(parsed.timestamp).toBeDefined();
      expect(new Date(parsed.timestamp)).toBeInstanceOf(Date);
    });

    it('should include service name', () => {
      logger.info('Message');

      const output = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);

      expect(parsed.service).toBe('test-service');
    });

    it('should include all required fields', () => {
      logger.info('Test message', { userId: 'user-1' }, 'corr-123');

      const output = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);

      expect(parsed).toHaveProperty('timestamp');
      expect(parsed).toHaveProperty('level');
      expect(parsed).toHaveProperty('message');
      expect(parsed).toHaveProperty('service');
      expect(parsed).toHaveProperty('correlationId');
      expect(parsed).toHaveProperty('data');
    });
  });

  describe('Correlation ID Tracking', () => {
    it('should propagate correlation ID across logs', () => {
      const correlationId = 'corr-abc-123';

      logger.info('First log', { step: 1 }, correlationId);
      logger.info('Second log', { step: 2 }, correlationId);

      const firstOutput = JSON.parse(consoleSpy.mock.calls[0][0]);
      const secondOutput = JSON.parse(consoleSpy.mock.calls[1][0]);

      expect(firstOutput.correlationId).toBe(correlationId);
      expect(secondOutput.correlationId).toBe(correlationId);
    });

    it('should handle missing correlation ID', () => {
      logger.info('Message without correlation ID');

      const output = JSON.parse(consoleSpy.mock.calls[0][0]);

      expect(output.correlationId).toBeUndefined();
    });
  });

  describe('Data Serialization', () => {
    it('should serialize complex objects', () => {
      const data = {
        user: { id: 'user-1', name: 'John' },
        order: { id: 'order-1', total: 100 },
        nested: { level1: { level2: 'value' } }
      };

      logger.info('Complex data', data);

      const output = JSON.parse(consoleSpy.mock.calls[0][0]);

      expect(output.data).toEqual(data);
    });

    it('should handle null and undefined values', () => {
      logger.info('Message', { nullValue: null, undefinedValue: undefined });

      const output = JSON.parse(consoleSpy.mock.calls[0][0]);

      expect(output.data.nullValue).toBeNull();
      expect(output.data.undefinedValue).toBeUndefined();
    });
  });

  describe('Log Levels', () => {
    it('should have all log levels defined', () => {
      expect(LogLevel.DEBUG).toBe('DEBUG');
      expect(LogLevel.INFO).toBe('INFO');
      expect(LogLevel.WARN).toBe('WARN');
      expect(LogLevel.ERROR).toBe('ERROR');
    });
  });
});
