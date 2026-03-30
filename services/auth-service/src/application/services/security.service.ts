import { getModelPrefix, makeId } from '@shared/ids/id';
import { prisma } from '../../infrastructure/database/prisma-client';
import { logger } from '../../infrastructure/services/logger.service';

const securityAuditPrefix = getModelPrefix('AuditLog');

/**
 * Security Service
 * Handles security event tracking and monitoring
 */
export class SecurityService {
  /**
   * Log security event
   */
  async logSecurityEvent(event: {
    type: string;
    userId: string;
    sessionId?: string;
    ipAddress: string;
    userAgent: string;
    timestamp: Date;
    details: any;
  }): Promise<void> {
    try {
      const auditLogDelegate = (prisma as any).auditLog;
      if (!auditLogDelegate || typeof auditLogDelegate.create !== 'function') {
        logger.warn('SecurityService.logSecurityEvent skipped: auditLog delegate unavailable');
        return;
      }

      const metadata = {
        securityType: event.type,
        sessionId: event.sessionId,
        details: event.details
      };

      await auditLogDelegate.create({
        data: {
          id: makeId(securityAuditPrefix),
          userId: event.userId,
          email: event.details?.email,
          action: `security:${event.type}`,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          success: event.details?.success ?? true,
          reason: event.details?.reason,
          metadata,
          timestamp: event.timestamp
        }
      });
    } catch (error) {
      logger.error('SecurityService.logSecurityEvent error', { error, event });
    }
  }

  /**
   * Get security events
   */
  async getSecurityEvents(params: {
    hours?: number;
    severity?: string;
    limit?: number;
  }): Promise<any[]> {
    try {
      const auditLogDelegate = (prisma as any).auditLog;
      if (!auditLogDelegate || typeof auditLogDelegate.findMany !== 'function') {
        logger.warn('SecurityService.getSecurityEvents skipped: auditLog delegate unavailable');
        return [];
      }

      const hours = params.hours ?? 24;
      const limit = params.limit ?? 100;
      const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

      const where: any = {
        action: { startsWith: 'security:' },
        timestamp: { gte: cutoff }
      };

      if (params.severity) {
        where.metadata = {
          path: ['details', 'severity'],
          equals: params.severity
        };
      }

      const records = await auditLogDelegate.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit
      });

      return records.map((record: any) => {
        const metadata = (record.metadata as any) || {};
        const securityType = String(record.action || '').replace(/^security:/, '');
        return {
          type: securityType,
          userId: record.userId,
          sessionId: metadata.sessionId,
          ipAddress: record.ipAddress,
          userAgent: record.userAgent,
          timestamp: record.timestamp,
          details: metadata.details ?? metadata
        };
      });
    } catch (error) {
      logger.error('SecurityService.getSecurityEvents error', { error, params });
      throw error;
    }
  }
}

// Export singleton instance
export const securityService = new SecurityService();
