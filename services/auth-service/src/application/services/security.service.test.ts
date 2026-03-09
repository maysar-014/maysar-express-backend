const mockLoggerWarn = jest.fn();
const mockLoggerError = jest.fn();

jest.mock('../../infrastructure/services/logger.service', () => ({
  logger: {
    warn: (...args: unknown[]) => mockLoggerWarn(...args),
    error: (...args: unknown[]) => mockLoggerError(...args),
    info: jest.fn(),
    debug: jest.fn()
  }
}));

import { SecurityService, securityService } from './security.service';

describe('SecurityService', () => {
  let service: SecurityService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SecurityService();
  });

  it('logs security events with normalized payload', async () => {
    const event = {
      type: 'failed_login',
      userId: 'user-1',
      sessionId: 'session-1',
      ipAddress: '192.168.1.1',
      userAgent: 'jest',
      timestamp: new Date('2026-03-08T00:00:00.000Z'),
      details: { reason: 'invalid_credentials' }
    };

    await service.logSecurityEvent(event);

    expect(mockLoggerWarn).toHaveBeenCalledWith(
      'Security event logged',
      expect.objectContaining({
        type: 'security',
        securityType: 'failed_login',
        userId: 'user-1',
        sessionId: 'session-1',
        ipAddress: '192.168.1.1',
        userAgent: 'jest',
        timestamp: '2026-03-08T00:00:00.000Z',
        details: { reason: 'invalid_credentials' }
      })
    );
  });

  it('returns security event list', async () => {
    const events = await service.getSecurityEvents({
      hours: 24,
      severity: 'high',
      limit: 10
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual(
      expect.objectContaining({
        type: 'failed_login',
        userId: 'user123',
        ipAddress: '192.168.1.100'
      })
    );
  });

  it('exports singleton service instance', () => {
    expect(securityService).toBeInstanceOf(SecurityService);
  });
});
