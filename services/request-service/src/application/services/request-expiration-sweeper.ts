/**
 * RequestExpirationSweeper (Phase 4 §4.1).
 *
 * Periodic background job (mirrors the logistics PoolOptimizationJob pattern):
 *   - expires PUBLISHED quotes past validUntil  → EXPIRED (request → ASSESSING
 *     for reassessment + a STATUS message "Quote expired — reassessment required")
 *   - expires ACTIVE access links past expiresAt → EXPIRED
 *   - expires supplier availability past availableUntil → UNAVAILABLE
 *   - expires stale requests per REQUEST_TTL_DAYS (default 30)
 *
 * Interval via REQUEST_SWEEPER_INTERVAL_MS (default 5 min). Every write is
 * best-effort: one failure never aborts the sweep. Audit rows accompany each
 * system transition.
 */

import { recordRequestAudit } from './request-audit';
import { publishRequestEvent } from '../../infrastructure/messaging/request-outbox';
import { RequestEntity, RequestData } from '../../domain/entities/request.entity';
import { RequestMessage } from '../../domain/entities/request-message.entity';

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;
const DEFAULT_TTL_DAYS = 30;
const EXPIRY_LEAD_MS_DEFAULT = 24 * 60 * 60 * 1000; // quote.expiring_soon lead time

export interface SweepStats {
  quotesExpired: number;
  linksExpired: number;
  suppliersExpired: number;
  requestsExpired: number;
  expiringSoonNotified: number;
}

export class RequestExpirationSweeper {
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private readonly intervalMs: number;
  private readonly ttlDays: number;
  private readonly expiryLeadMs: number;

  constructor() {
    const parsedInterval = Number(process.env.REQUEST_SWEEPER_INTERVAL_MS);
    this.intervalMs = Number.isFinite(parsedInterval) && parsedInterval > 0
      ? parsedInterval
      : DEFAULT_INTERVAL_MS;
    const parsedTtl = Number(process.env.REQUEST_TTL_DAYS);
    this.ttlDays = Number.isFinite(parsedTtl) && parsedTtl > 0 ? parsedTtl : DEFAULT_TTL_DAYS;
    const parsedLead = Number(process.env.QUOTE_EXPIRY_LEAD_MS);
    this.expiryLeadMs = Number.isFinite(parsedLead) && parsedLead > 0
      ? parsedLead
      : EXPIRY_LEAD_MS_DEFAULT;
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.runOnce();
    }, this.intervalMs);
    if (typeof this.timer.unref === 'function') this.timer.unref();
    console.log(`[RequestSweeper] started (interval=${this.intervalMs}ms, ttlDays=${this.ttlDays})`);
  }

  stop(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
    console.log('[RequestSweeper] stopped');
  }

  async runOnce(now: Date = new Date()): Promise<SweepStats> {
    const stats: SweepStats = {
      quotesExpired: 0,
      linksExpired: 0,
      suppliersExpired: 0,
      requestsExpired: 0,
      expiringSoonNotified: 0,
    };
    if (this.running) return stats; // overlap-safe
    this.running = true;
    try {
      await this.expireQuotes(now, stats);
      await this.notifyExpiringQuotes(now, stats);
      await this.expireLinks(now, stats);
      await this.expireSupplierAvailability(now, stats);
      await this.expireStaleRequests(now, stats);
    } catch (err: any) {
      console.error('[RequestSweeper] sweep failed (non-fatal):', err?.message);
    } finally {
      this.running = false;
    }
    return stats;
  }

  /** Private sweep implementations — each guarded, best-effort, audited. */

  private async expireQuotes(now: Date, stats: SweepStats): Promise<void> {
    const prisma = (globalThis as any).prisma;
    if (!prisma?.request_Quote?.findMany || !prisma?.request_Quote?.update) return;
    try {
      const stale = await prisma.request_Quote.findMany({
        where: { status: 'PUBLISHED', validUntil: { lt: now } },
        select: { quoteId: true, requestId: true },
        take: 200,
      });
      for (const q of stale) {
        try {
          await prisma.request_Quote.update({
            where: { quoteId: q.quoteId },
            data: { status: 'EXPIRED' },
          });
          await recordRequestAudit({
            requestId: q.requestId,
            actorType: 'SYSTEM',
            action: 'QUOTE_EXPIRED',
            toStatus: 'EXPIRED',
            detail: { quoteId: q.quoteId },
          });
          await publishRequestEvent('quote.expired', { quoteId: q.quoteId, requestId: q.requestId });
          // §4.1 expiry semantics: expired quote → request returns to ASSESSING
          // for reassessment + a STATUS conversation message. Never touches a
          // request that is CONVERTED / CANCELLED / EXPIRED.
          await this.reassessRequest(prisma, q.requestId, q.quoteId);
          stats.quotesExpired += 1;
        } catch (err: any) {
          console.error('[RequestSweeper] quote expiry failed:', err?.message);
        }
      }
    } catch (err: any) {
      console.error('[RequestSweeper] quote scan failed:', err?.message);
    }
  }

  private async reassessRequest(prisma: any, requestId: string, quoteId: string): Promise<void> {
    const row = await prisma.request_Request?.findUnique?.({ where: { id: requestId } });
    if (!row) return;
    // Never reassess a terminal/finished request.
    if (row.status === 'CONVERTED' || row.status === 'CANCELLED' || row.status === 'EXPIRED') return;
    const entity = new RequestEntity(this.rowToRequestData(row));
    try {
      entity.returnToAssessing();
    } catch {
      return; // defensive — not in a reassessable state
    }
    await prisma.request_Request.update({
      where: { id: requestId },
      data: { status: entity.status, updatedAt: new Date() },
    });
    const detail = { quoteId };
    const msg = RequestMessage.create({
      requestId,
      authorType: 'STATUS',
      authorId: null,
      body: 'Quote expired — reassessment required',
    });
    const d = msg.toJSON();
    await prisma.request_Message.create({
      data: {
        id: d.id,
        requestId: d.requestId,
        authorType: d.authorType,
        authorId: d.authorId,
        body: d.body,
        attachments: d.attachments,
        createdAt: d.createdAt,
      },
    });
    await recordRequestAudit({
      requestId,
      actorType: 'SYSTEM',
      action: 'STATUS_CHANGED',
      fromStatus: row.status,
      toStatus: entity.status,
      detail,
    });
  }

  private rowToRequestData(row: any): RequestData {
    return {
      id: row.id,
      customerId: row.customerId,
      title: row.title,
      description: row.description,
      deliveryAddress: row.deliveryAddress ?? { city: '', region: '' },
      preferredDeliveryDate: row.preferredDeliveryDate,
      budgetTzs: row.budgetTzs,
      attachments: row.attachments,
      status: row.status,
      assignedProviderId: row.assignedProviderId,
      unfulfillableReason: row.unfulfillableReason,
      orderId: row.orderId,
      convertedQuoteId: row.convertedQuoteId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private async notifyExpiringQuotes(now: Date, stats: SweepStats): Promise<void> {
    const prisma = (globalThis as any).prisma;
    if (!prisma?.request_Quote?.findMany) return;
    const horizon = new Date(now.getTime() + this.expiryLeadMs);
    try {
      const soon = await prisma.request_Quote.findMany({
        where: { status: 'PUBLISHED', validUntil: { gte: now, lte: horizon } },
        select: { quoteId: true, requestId: true },
        take: 200,
      });
      for (const q of soon) {
        await publishRequestEvent('quote.expiring_soon', {
          quoteId: q.quoteId,
          requestId: q.requestId,
          validUntil: horizon.toISOString(),
        });
        stats.expiringSoonNotified += 1;
      }
    } catch (err: any) {
      console.error('[RequestSweeper] expiring-soon scan failed:', err?.message);
    }
  }

  private async expireLinks(now: Date, stats: SweepStats): Promise<void> {
    const prisma = (globalThis as any).prisma;
    if (!prisma?.request_AccessLink?.findMany || !prisma?.request_AccessLink?.update) return;
    try {
      const stale = await prisma.request_AccessLink.findMany({
        where: { status: 'ACTIVE', expiresAt: { lt: now } },
        select: { id: true, requestId: true, quoteId: true },
        take: 200,
      });
      for (const l of stale) {
        try {
          await prisma.request_AccessLink.update({
            where: { id: l.id },
            data: { status: 'EXPIRED' },
          });
          await publishRequestEvent('link.expired', {
            linkId: l.id,
            requestId: l.requestId,
            quoteId: l.quoteId,
          });
          stats.linksExpired += 1;
        } catch (err: any) {
          console.error('[RequestSweeper] link expiry failed:', err?.message);
        }
      }
    } catch (err: any) {
      console.error('[RequestSweeper] link expiry scan failed:', err?.message);
    }
  }

  private async expireSupplierAvailability(now: Date, stats: SweepStats): Promise<void> {
    const prisma = (globalThis as any).prisma;
    if (!prisma?.request_Source?.updateMany) return;
    try {
      const res = await prisma.request_Source.updateMany({
        where: { status: 'CONFIRMED', availableUntil: { lt: now } },
        data: { status: 'UNAVAILABLE' },
      });
      stats.suppliersExpired = res?.count ?? 0;
    } catch (err: any) {
      console.error('[RequestSweeper] supplier availability expiry failed:', err?.message);
    }
  }

  private async expireStaleRequests(now: Date, stats: SweepStats): Promise<void> {
    const prisma = (globalThis as any).prisma;
    if (!prisma?.request_Request?.findMany || !prisma?.request_Request?.update) return;
    const cutoff = new Date(now.getTime() - this.ttlDays * 24 * 60 * 60 * 1000);
    try {
      const stale = await prisma.request_Request.findMany({
        where: {
          status: { in: ['SUBMITTED', 'ASSESSING', 'NEEDS_CLARIFICATION'] },
          updatedAt: { lt: cutoff },
        },
        select: { requestId: true },
        take: 200,
      });
      for (const r of stale) {
        try {
          await prisma.request_Request.update({
            where: { requestId: r.requestId },
            data: { status: 'EXPIRED' },
          });
          await recordRequestAudit({
            requestId: r.requestId,
            actorType: 'SYSTEM',
            action: 'REQUEST_EXPIRED',
            toStatus: 'EXPIRED',
            detail: { ttlDays: this.ttlDays },
          });
          await publishRequestEvent('request.expired', { requestId: r.requestId });
          stats.requestsExpired += 1;
        } catch (err: any) {
          console.error('[RequestSweeper] request expiry failed:', err?.message);
        }
      }
    } catch (err: any) {
      console.error('[RequestSweeper] stale-request scan failed:', err?.message);
    }
  }
}
