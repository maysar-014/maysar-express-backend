import { PrismaClient } from '@prisma/client';
import { AuditInfo } from '../../domain/value-objects/audit-info.value-object';

export interface IAuditLogRepository {
    save(info: AuditInfo, entityId: string, entityType: string, action: string): Promise<void>;
}

export class AuditLogRepository implements IAuditLogRepository {
    constructor(private readonly prisma: PrismaClient) { }

    async save(info: AuditInfo, entityId: string, entityType: string, action: string): Promise<void> {
        await this.prisma.wallet_AuditLog.create({
            data: {
                entityId,
                entityType,
                action,
                actorId: info.actor,
                actorType: info.actorType,
                metadata: {
                    ...info.metadata,
                    reason: info.reason,
                    ipAddress: info.ipAddress,
                    userAgent: info.userAgent
                }
            }
        });
    }
}
