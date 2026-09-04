import { VerificationAuditLogRepository } from '../../domain/repositories/verification-audit-log.repository';
import { VerificationAuditLogEntry } from '../../domain/entities/verification-audit-log.entity';
import { databaseManager } from '../../config/database.config';
import { makeId } from '@shared/ids/id';

export class PrismaVerificationAuditLogRepository implements VerificationAuditLogRepository {
  private get db(): any {
    return databaseManager.getPrisma() as any;
  }

  private get delegate(): any {
    return this.db.order_VerificationAuditLog;
  }

  /**
   * Append an immutable audit log entry.
   * Pass a Prisma transaction client (tx) to atomically co-commit with the order update.
   */
  async append(entry: VerificationAuditLogEntry, tx?: any): Promise<void> {
    const client = tx ?? this.db;
    const delegate = tx ? tx.order_VerificationAuditLog : this.delegate;

    if (!delegate) {
      // Table not yet migrated — log and continue (non-fatal during migration window)
      console.warn('[VerificationAuditLog] order_VerificationAuditLog table not found — skipping audit entry', {
        orderId: entry.orderId,
        newStatus: entry.newStatus,
      });
      return;
    }

    await delegate.create({
      data: {
        id: entry.id || makeId('vau'),
        orderId: entry.orderId,
        entryType: entry.entryType,
        actorType: entry.actorType,
        actorId: entry.actorId ?? null,
        previousStatus: entry.previousStatus,
        newStatus: entry.newStatus,
        reason: entry.reason ?? null,
        notes: entry.notes ?? null,
        timestamp: entry.timestamp,
      },
    });
  }

  /**
   * Return all audit entries for an order sorted ascending by timestamp.
   */
  async findByOrderId(orderId: string): Promise<VerificationAuditLogEntry[]> {
    if (!this.delegate) {
      return [];
    }

    const rows = await this.delegate.findMany({
      where: { orderId },
      orderBy: { timestamp: 'asc' },
    });

    return rows.map((row: any) => ({
      id: row.id,
      orderId: row.orderId,
      entryType: row.entryType,
      actorType: row.actorType,
      actorId: row.actorId ?? undefined,
      previousStatus: row.previousStatus,
      newStatus: row.newStatus,
      reason: row.reason ?? undefined,
      notes: row.notes ?? undefined,
      timestamp: row.timestamp,
    }));
  }
}
