import { Prisma } from '@prisma/client';
import prisma from '../database/prisma-client';
import {
    EnablerEnforcementRecord,
    IEnablerEnforcementRepository,
} from '../../domain/repositories/enabler-enforcement.repository.interface';
import { getModelPrefix, makeId } from '@shared/ids/id';

/**
 * Persists the admin enforcement trail (§34, §52). Rows are append-only: there
 * is no update or delete method on this repository by design, so the history of
 * restrict/suspend/reactivate/deactivate decisions cannot be rewritten.
 */
export class PrismaEnablerEnforcementRepository implements IEnablerEnforcementRepository {
    async record(entry: Omit<EnablerEnforcementRecord, 'id' | 'createdAt'>): Promise<void> {
        await prisma.enabler_EnforcementAction.create({
            data: {
                id: makeId(getModelPrefix('Enabler_EnforcementAction')),
                enablerId: entry.enablerId,
                action: entry.action,
                previousStatus: entry.previousStatus as any,
                newStatus: entry.newStatus as any,
                reason: entry.reason ?? null,
                actorUserId: entry.actorUserId ?? null,
                metadata: (entry.metadata ?? null) as Prisma.InputJsonValue,
            },
        });
    }

    async listForEnabler(enablerId: string, limit = 50): Promise<EnablerEnforcementRecord[]> {
        const records = await prisma.enabler_EnforcementAction.findMany({
            where: { enablerId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        return records.map((record) => ({
            id: record.id,
            enablerId: record.enablerId,
            action: record.action as EnablerEnforcementRecord['action'],
            previousStatus: record.previousStatus,
            newStatus: record.newStatus,
            reason: record.reason,
            actorUserId: record.actorUserId,
            metadata: (record.metadata ?? null) as Record<string, unknown> | null,
            createdAt: record.createdAt,
        }));
    }
}
