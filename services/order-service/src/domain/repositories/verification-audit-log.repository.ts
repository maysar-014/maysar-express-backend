import { VerificationAuditLogEntry } from '../entities/verification-audit-log.entity';

export interface VerificationAuditLogRepository {
  /**
   * Append an immutable audit log entry.
   * Pass a Prisma transaction client (tx) to atomically co-commit with an order status update.
   */
  append(entry: VerificationAuditLogEntry, tx?: unknown): Promise<void>;

  /**
   * Return all audit log entries for an order, sorted ascending by timestamp.
   */
  findByOrderId(orderId: string): Promise<VerificationAuditLogEntry[]>;
}
