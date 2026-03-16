const mockLoggerWarn = jest.fn();
const mockLoggerError = jest.fn();

const prismaAuditLogCreateMock = jest.fn();
const prismaAuditLogFindManyMock = jest.fn();

jest.mock('../../infrastructure/database/prisma-client', () => ({
  prisma: {
    auditLog: {
      create: prismaAuditLogCreateMock,
      findMany: prismaAuditLogFindManyMock
    }
  }
}));

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

    expect(prismaAuditLogCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          action: 'security:failed_login',
          ipAddress: '192.168.1.1',
          userAgent: 'jest'
        })
      })
    );
  });

  it('returns security event list', async () => {
    prismaAuditLogFindManyMock.mockResolvedValueOnce([
      {
        action: 'security:failed_login',
        userId: 'user123',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date('2026-03-08T00:00:00.000Z'),
        metadata: { details: { reason: 'invalid_credentials' } }
      }
    ]);
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
