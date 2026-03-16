const authLoggerInfoMock = jest.fn();
const authLoggerErrorMock = jest.fn();
const sharedLoggerErrorMock = jest.fn();
const prismaEventLogCreateMock = jest.fn();
const prismaAuditLogCreateMock = jest.fn();
const prismaAuditLogFindManyMock = jest.fn();
const prismaAuditLogCountMock = jest.fn();
const prismaTransactionMock = jest.fn();
const prismaCtorMock = jest.fn().mockImplementation(() => ({
  eventLog: {
    create: prismaEventLogCreateMock
  }
}));

jest.mock('../../infrastructure/services/logger.service', () => ({
  logger: {
    info: authLoggerInfoMock,
    error: authLoggerErrorMock,
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

jest.mock('../../../../../shared/logger/logger', () => ({
  createLogger: jest.fn(() => ({
    error: sharedLoggerErrorMock
  }))
}));

jest.mock('@prisma/client', () => ({
  PrismaClient: prismaCtorMock
}));

jest.mock('../../infrastructure/database/prisma-client', () => ({
  prisma: {
    auditLog: {
      create: prismaAuditLogCreateMock,
      findMany: prismaAuditLogFindManyMock,
      count: prismaAuditLogCountMock
    },
    $transaction: prismaTransactionMock
  }
}));

import { AuditService as AuthAuditService } from './audit.service';

describe('audit service contracts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaTransactionMock.mockImplementation(async (arg: any) => {
      if (Array.isArray(arg)) {
        return Promise.all(arg);
      }
      return arg({ auditLog: { create: prismaAuditLogCreateMock } });
    });
  });

  afterEach(() => {
    jest.resetModules();
  });

  it('logs auth audit events and returns mock logs', async () => {
    const service = new AuthAuditService();

    prismaAuditLogCreateMock.mockResolvedValueOnce(undefined);
    await service.logAuditEvent({
      userId: 'user-1',
      action: 'LOGIN',
      resource: 'auth',
      details: { ip: '127.0.0.1' }
    });

    expect(prismaAuditLogCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          action: 'LOGIN'
        })
      })
    );

    prismaAuditLogFindManyMock.mockResolvedValueOnce([
      {
        id: 'audit-1',
        userId: 'user-1',
        action: 'LOGIN',
        timestamp: new Date('2026-03-08T00:00:00.000Z')
      }
    ]);
    prismaAuditLogCountMock.mockResolvedValueOnce(1);
    const logsResult = await service.getAuditLogs({ userId: 'user-1', action: 'LOGIN' });
    expect(logsResult.total).toBe(1);
    expect(logsResult.logs[0]).toEqual(
      expect.objectContaining({
        userId: 'user-1',
        action: 'LOGIN'
      })
    );
  });

  it('rethrows auth logging failures after recording error', async () => {
    prismaAuditLogCreateMock.mockRejectedValueOnce(new Error('db unavailable'));
    const service = new AuthAuditService();

    await expect(
      service.logAuditEvent({
        userId: 'user-2',
        action: 'UPDATE',
        resource: 'profile',
        details: {}
      })
    ).rejects.toThrow('db unavailable');
    expect(authLoggerErrorMock).toHaveBeenCalled();
  });

  it('persists shared audit records and logs persistence failures without throwing', async () => {
    const sharedModule = await import('../../../../../shared/audit/audit.service');
    const sharedService = sharedModule.AuditService.getInstance();

    prismaEventLogCreateMock.mockResolvedValueOnce(undefined);
    await expect(
      sharedService.saveEventBusAudit({
        eventType: 'order.created',
        eventId: 'evt-1',
        timestamp: '2026-01-01T00:00:00.000Z',
        dataSummary: 'summary'
      })
    ).resolves.toBeUndefined();
    expect(prismaEventLogCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventId: 'evt-1',
          consumerName: 'event-bus-audit'
        })
      })
    );

    prismaEventLogCreateMock.mockRejectedValueOnce(new Error('db down'));
    await expect(
      sharedService.saveEventBusAudit({
        eventType: 'order.created',
        eventId: 'evt-2',
        timestamp: '2026-01-01T00:00:00.000Z',
        dataSummary: 'summary'
      })
    ).resolves.toBeUndefined();
    expect(sharedLoggerErrorMock).toHaveBeenCalledWith(
      'Failed to persist audit record',
      expect.any(Error),
      { eventId: 'evt-2' }
    );
  });
});
