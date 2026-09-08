/**
 * Request-domain outbox publisher (Phase 1).
 *
 * Writes Request_OutboxEvent rows (append-only). Best-effort: a publish
 * failure never fails the primary operation — consumers can reconcile from
 * the request tables.
 */

import { randomUUID } from 'crypto';

export type RequestDomainEventType =
  | 'request.submitted'
  | 'request.assessing'
  | 'request.needs_clarification'
  | 'request.fulfillable'
  | 'request.unfulfillable'
  | 'request.cancelled'
  | 'quote.published'
  | 'quote.expired'
  | 'quote.expiring_soon'
  | 'link.expired'
  | 'request.expired'
  | 'request.converted'
  | 'supplier.invite_recommended';

export async function publishRequestEvent(
  eventType: RequestDomainEventType,
  payload: Record<string, unknown>,
): Promise<void> {
  const prisma = (globalThis as any).prisma;
  if (!prisma?.request_OutboxEvent?.create) return;

  try {
    await prisma.request_OutboxEvent.create({
      data: {
        eventId: randomUUID(),
        eventType,
        eventData: { ...payload, occurredAt: new Date().toISOString() },
        status: 'PENDING',
      },
    });
  } catch (err: any) {
    // Best-effort only.
    console.error(`[RequestEvents] Failed to persist ${eventType} outbox event:`, err?.message);
  }
}