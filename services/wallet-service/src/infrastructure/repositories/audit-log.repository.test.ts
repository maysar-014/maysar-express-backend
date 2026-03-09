import { ActorType, AuditInfo } from '../../domain/value-objects/audit-info.value-object';
import { AuditLogRepository } from './audit-log.repository';

describe('AuditLogRepository', () => {
  it('saves audit log with merged metadata context', async () => {
    const prisma = {
      wallet_AuditLog: {
        create: jest.fn().mockResolvedValue(undefined)
      }
    };
    const repository = new AuditLogRepository(prisma as never);
    const info = new AuditInfo({
      actor: 'admin-1',
      actorType: ActorType.ADMIN,
      action: 'MANUAL_ADJUSTMENT',
      reason: 'Fraud correction',
      timestamp: new Date('2026-03-09T12:00:00.000Z'),
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
      metadata: { ticketId: 'support-77' }
    });

    await repository.save(info, 'wallet-1', 'WALLET', 'CREDIT');

    expect(prisma.wallet_AuditLog.create).toHaveBeenCalledWith({
      data: {
        entityId: 'wallet-1',
        entityType: 'WALLET',
        action: 'CREDIT',
        actorId: 'admin-1',
        actorType: ActorType.ADMIN,
        metadata: {
          ticketId: 'support-77',
          reason: 'Fraud correction',
          ipAddress: '127.0.0.1',
          userAgent: 'jest'
        }
      }
    });
  });
});

