import { PrismaClient } from '@prisma/client';
import { getModelPrefix, makeId } from '@shared/ids/id';
import { IAuditRepository } from '../../domain/repositories';

export class PrismaAuditRepository implements IAuditRepository {
  constructor(private readonly prisma: PrismaClient) { }

  async logAuthentication(event: {
    userId?: string;
    email?: string;
    action: 'login_success' | 'login_failure' | 'logout' | 'password_change' | 'password_reset' | 'account_lock' | 'account_unlock' | 'suspicious_activity';
    ipAddress: string;
    userAgent: string;
    success: boolean;
    reason?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        id: makeId(getModelPrefix('AuditLog')),
        userId: event.userId,
        email: event.email,
        action: event.action,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        success: event.success,
        reason: event.reason,
        metadata: event.metadata
      }
    });
  }

  async logUserManagement(event: {
    adminId: string;
    targetUserId: string;
    action: 'user_created' | 'user_updated' | 'user_deleted' | 'role_changed' | 'status_changed';
    oldValue?: any;
    newValue?: any;
    reason?: string;
  }): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        id: makeId(getModelPrefix('AuditLog')),
        userId: event.targetUserId,
        action: `user_management:${event.action}`,
        ipAddress: 'system',
        userAgent: 'system',
        success: true,
        reason: event.reason,
        metadata: {
          adminId: event.adminId,
          oldValue: event.oldValue,
          newValue: event.newValue
        }
      }
    });
  }

  async getUserAuditLogs(userId: string, limit: number = 50): Promise<Array<{
    id: string;
    timestamp: Date;
    action: string;
    ipAddress: string;
    userAgent: string;
    success: boolean;
    reason?: string;
    metadata?: Record<string, any>;
  }>> {
    const records = await this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: limit
    });

    return records.map(record => ({
      id: record.id,
      timestamp: record.timestamp,
      action: record.action,
      ipAddress: record.ipAddress,
      userAgent: record.userAgent,
      success: record.success,
      reason: record.reason || undefined,
      metadata: (record.metadata as Record<string, any>) || undefined
    }));
  }

  async getSecurityEvents(hours: number = 24): Promise<Array<{
    id: string;
    timestamp: Date;
    userId?: string;
    email?: string;
    action: string;
    ipAddress: string;
    success: boolean;
    reason?: string;
  }>> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const records = await this.prisma.auditLog.findMany({
      where: { timestamp: { gte: cutoff } },
      orderBy: { timestamp: 'desc' }
    });

    return records.map(record => ({
      id: record.id,
      timestamp: record.timestamp,
      userId: record.userId || undefined,
      email: record.email || undefined,
      action: record.action,
      ipAddress: record.ipAddress,
      success: record.success,
      reason: record.reason || undefined
    }));
  }
}
