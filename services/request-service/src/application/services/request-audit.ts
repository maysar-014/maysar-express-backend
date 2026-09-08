/**
 * Request audit trail (Phase 4 §4.3).
 *
 * Every mutation use case writes one append-only Request_AuditLog row inside
 * (or alongside) its transaction. Best-effort at the persistence edge — an
 * audit failure is logged, never fatal, mirroring the outbox publisher.
 */

import { randomUUID } from 'crypto';

export type RequestAuditActorType = 'CUSTOMER' | 'PROVIDER' | 'SYSTEM';

export type RequestAuditAction =
  | 'STATUS_CHANGED'
  | 'MESSAGE_POSTED'
  | 'ASSESSED'
  | 'ITEM_ADDED'
  | 'SOURCE_SET'
  | 'SUPPLIER_REGISTERED'
  | 'SUPPLIER_INVITE_READY'
  | 'SUPPLIER_INVITED'
  | 'PROCUREMENT_ADVANCED'
  | 'QUOTE_CREATED'
  | 'QUOTE_PUBLISHED'
  | 'QUOTE_EXPIRED'
  | 'REQUEST_EXPIRED'
  | 'LINK_GENERATED'
  | 'CONVERTED'
  | 'EXPIRED_STALE'
  | 'CANCELLED';

export interface RequestAuditInput {
  requestId: string;
  actorType: RequestAuditActorType;
  actorId?: string | null;
  action: RequestAuditAction;
  fromStatus?: string | null;
  toStatus?: string | null;
  detail?: Record<string, unknown>;
}

export async function recordRequestAudit(input: RequestAuditInput): Promise<void> {
  const prisma = (globalThis as any).prisma;
  if (!prisma?.request_AuditLog?.create) return;

  try {
    await prisma.request_AuditLog.create({
      data: {
        auditId: `AUD-${randomUUID()}`,
        requestId: input.requestId,
        actorType: input.actorType,
        actorId: input.actorId ?? null,
        action: input.action,
        fromStatus: input.fromStatus ?? null,
        toStatus: input.toStatus ?? null,
        detail: input.detail ?? undefined,
      },
    });
  } catch (err: any) {
    // Append-only audit must never break the primary operation.
    console.error('[RequestAudit] Failed to persist audit row:', err?.message);
  }
}

export async function listRequestAudit(
  requestId: string,
): Promise<Array<Record<string, unknown>>> {
  const prisma = (globalThis as any).prisma;
  if (!prisma?.request_AuditLog?.findMany) return [];
  return prisma.request_AuditLog.findMany({
    where: { requestId },
    orderBy: { createdAt: 'asc' },
  });
}
