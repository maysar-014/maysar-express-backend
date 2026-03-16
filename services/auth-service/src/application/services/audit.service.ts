import { getModelPrefix, makeId } from '@shared/ids/id';
import { prisma } from '../../infrastructure/database/prisma-client';
import { logger } from '../../infrastructure/services/logger.service';

const auditIdPrefix = getModelPrefix('AuditLog');

/**
 * Audit Service
 * Handles audit logging and security event tracking
 */
export class AuditService {
  /**
   * Log audit event
   */
  async logAuditEvent(event: {
    userId: string;
    action: string;
    resource: string;
    details: any;
  }): Promise<void> {
    try {
      const details = event.details || {};
      const ipAddress = details.ipAddress || details.ip || 'system';
      const userAgent = details.userAgent || 'system';
      const metadata = {
        resource: event.resource,
        details
      };

      await prisma.auditLog.create({
        data: {
          id: makeId(auditIdPrefix),
          userId: event.userId,
          email: details.email,
          action: event.action,
          ipAddress,
          userAgent,
          success: details.success ?? true,
          reason: details.reason,
          metadata
        }
      });
    } catch (error) {
      logger.error('AuditService.logAuditEvent error', { error, event });
      throw error;
    }
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(params: {
    userId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: any[]; total: number }> {
    try {
      const where: any = {};
      if (params.userId) {
        where.userId = params.userId;
      }
      if (params.action) {
        where.action = params.action;
      }
      if (params.startDate || params.endDate) {
        where.timestamp = {};
        if (params.startDate) {
          where.timestamp.gte = new Date(params.startDate);
        }
        if (params.endDate) {
          where.timestamp.lte = new Date(params.endDate);
        }
      }

      const limit = params.limit ?? 100;
      const offset = params.offset ?? 0;

      const [logs, total] = await prisma.$transaction([
        prisma.auditLog.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          take: limit,
          skip: offset
        }),
        prisma.auditLog.count({ where })
      ]);

      return {
        logs,
        total
      };
    } catch (error) {
      logger.error('AuditService.getAuditLogs error', { error, params });
      throw error;
    }
  }
}

// Export singleton instance
export const auditService = new AuditService();
