/**
 * Maysar Engineering — Immutable Audit Log for Financial Transactions
 * 
 * Governing Document: Maysar Engineering Constitution v1.0
 *   - Article 17: Security by Design — Auditability
 *   - Article 18: Financial and Transactional Integrity — Authorization and auditability
 *   - Article 20: Evidence-Based Auditing
 *   - Article 27.4: AI Engineering Accountability — Never fabricate verification claims
 * 
 * Implements an append-only audit log for all financial operations.
 * Each entry captures: actor, action, resource, before/after state, timestamp, IP, user agent.
 * The database schema enforces append-only (no UPDATE/DELETE on audit log table).
 */

import { prisma } from '../config/prisma';

export interface AuditLogEntry {
    actorId: string;
    actorType: 'user' | 'system' | 'ai-agent';
    action: string;
    resourceType: string;
    resourceId: string;
    beforeState?: Record<string, unknown> | null;
    afterState?: Record<string, unknown> | null;
    ipAddress?: string;
    userAgent?: string;
}

/**
 * Type matching the Compliance_ComplianceAuditLog Prisma model shape.
 */
type ComplianceAuditLogEntry = {
    id: string;
    action: string;
    resource: string;
    userId: string;
    timestamp: Date;
    ipAddress: string | null;
    userAgent: string | null;
    details: unknown;
};

/**
 * Append-only audit logger for financial transactions.
 * 
 * All financial operations (payment, wallet transfer, escrow release, order creation,
 * refund, etc.) must call this to create an immutable audit record.
 * 
 * The audit log table is append-only at the database level — no UPDATE or DELETE
 * permissions are granted, ensuring tamper-evident records.
 */
export class AuditLogger {
    /**
     * Log a financial operation to the audit trail.
     * 
     * @param params - Audit log entry parameters
     * @throws {Error} If the database insert fails
     */
    static async log(params: AuditLogEntry): Promise<void> {
        await prisma.compliance_ComplianceAuditLog.create({
            data: {
                action: params.action,
                resource: `${params.resourceType}:${params.resourceId}`,
                userId: params.actorId,
                ipAddress: params.ipAddress ?? undefined,
                userAgent: params.userAgent ?? undefined,
                details: JSON.stringify({
                    actorType: params.actorType,
                    resourceType: params.resourceType,
                    resourceId: params.resourceId,
                    beforeState: params.beforeState,
                    afterState: params.afterState,
                }),
            },
        });
    }

    /**
     * Retrieve the audit trail for a specific resource.
     * Returns events in chronological order (oldest first).
     * 
     * @param resourceType - Type of resource (e.g., 'payment', 'wallet', 'escrow')
     * @param resourceId - ID of the specific resource
     * @returns Array of audit log entries, oldest first
     */
    static async getAuditTrail(
        resourceType: string,
        resourceId: string
    ): Promise<Array<{
        id: string;
        actorId: string;
        actorType: string;
        action: string;
        resourceType: string;
        resourceId: string;
        beforeState: Record<string, unknown> | null;
        afterState: Record<string, unknown> | null;
        ipAddress: string | null;
        userAgent: string | null;
        createdAt: Date;
    }>> {
        const entries = await prisma.compliance_ComplianceAuditLog.findMany({
            where: {
                resource: `${resourceType}:${resourceId}`,
            },
            orderBy: {
                timestamp: 'asc',
            },
        });

        return entries.map((entry: ComplianceAuditLogEntry) => {
            const details = entry.details as Record<string, unknown> | null;
            return {
                id: entry.id,
                actorId: entry.userId,
                actorType: (details?.actorType as string) || 'user',
                action: entry.action,
                resourceType: (details?.resourceType as string) || resourceType,
                resourceId: (details?.resourceId as string) || resourceId,
                beforeState: (details?.beforeState as Record<string, unknown>) || null,
                afterState: (details?.afterState as Record<string, unknown>) || null,
                ipAddress: entry.ipAddress,
                userAgent: entry.userAgent,
                createdAt: entry.timestamp,
            };
        });
    }

    /**
     * Retrieve all audit logs for a specific actor (user, system, or AI agent).
     * Useful for compliance investigations.
     * 
     * @param actorId - ID of the actor
     * @param limit - Maximum number of entries to return (default: 100)
     * @returns Array of audit log entries, newest first
     */
    static async getActorAuditTrail(
        actorId: string,
        limit: number = 100
    ): Promise<Array<{
        id: string;
        actorId: string;
        actorType: string;
        action: string;
        resourceType: string;
        resourceId: string;
        beforeState: Record<string, unknown> | null;
        afterState: Record<string, unknown> | null;
        ipAddress: string | null;
        userAgent: string | null;
        createdAt: Date;
    }>> {
        const entries = await prisma.compliance_ComplianceAuditLog.findMany({
            where: {
                userId: actorId,
            },
            orderBy: {
                timestamp: 'desc',
            },
            take: limit,
        });

        return entries.map((entry: ComplianceAuditLogEntry) => {
            const details = entry.details as Record<string, unknown> | null;
            return {
                id: entry.id,
                actorId: entry.userId,
                actorType: (details?.actorType as string) || 'user',
                action: entry.action,
                resourceType: (details?.resourceType as string) || '',
                resourceId: (details?.resourceId as string) || '',
                beforeState: (details?.beforeState as Record<string, unknown>) || null,
                afterState: (details?.afterState as Record<string, unknown>) || null,
                ipAddress: entry.ipAddress,
                userAgent: entry.userAgent,
                createdAt: entry.timestamp,
            };
        });
    }

    /**
     * Retrieve audit logs within a time range.
     * Useful for compliance reporting and incident investigation.
     * 
     * @param startTime - Start of time range (inclusive)
     * @param endTime - End of time range (inclusive)
     * @param limit - Maximum number of entries to return (default: 1000)
     * @returns Array of audit log entries, newest first
     */
    static async getAuditTrailByTimeRange(
        startTime: Date,
        endTime: Date,
        limit: number = 1000
    ): Promise<Array<{
        id: string;
        actorId: string;
        actorType: string;
        action: string;
        resourceType: string;
        resourceId: string;
        beforeState: Record<string, unknown> | null;
        afterState: Record<string, unknown> | null;
        ipAddress: string | null;
        userAgent: string | null;
        createdAt: Date;
    }>> {
        const entries = await prisma.compliance_ComplianceAuditLog.findMany({
            where: {
                timestamp: {
                    gte: startTime,
                    lte: endTime,
                },
            },
            orderBy: {
                timestamp: 'desc',
            },
            take: limit,
        });

        return entries.map((entry: ComplianceAuditLogEntry) => {
            const details = entry.details as Record<string, unknown> | null;
            return {
                id: entry.id,
                actorId: entry.userId,
                actorType: (details?.actorType as string) || 'user',
                action: entry.action,
                resourceType: (details?.resourceType as string) || '',
                resourceId: (details?.resourceId as string) || '',
                beforeState: (details?.beforeState as Record<string, unknown>) || null,
                afterState: (details?.afterState as Record<string, unknown>) || null,
                ipAddress: entry.ipAddress,
                userAgent: entry.userAgent,
                createdAt: entry.timestamp,
            };
        });
    }
}

