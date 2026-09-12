/**
 * RequestExpirationSweeper (Phase 4 §4.1) — acceptance tests.
 *
 * Drives the REAL sweeper with a fake globalThis.prisma (the only seam the
 * job touches). Covers the §4.1 acceptance contract:
 *   - an expired PUBLISHED quote sweeps to EXPIRED
 *   - the owning request returns to ASSESSING ("Quote expired — reassessment
 *     required" STATUS message + STATUS_CHANGED audit)
 *   - a quote inside the expiring-soon window emits quote.expiring_soon
 *   - a request that is CONVERTED is never reassessed
 */

import { RequestExpirationSweeper, SweepStats } from '../request-expiration-sweeper';

interface RequestRow {
  id: string;
  customerId: string;
  title: string;
  description: string;
  deliveryAddress: { city: string; region: string };
  preferredDeliveryDate: Date | null;
  budgetTzs: number | null;
  attachments: string[] | null;
  status: string;
  assignedProviderId: string | null;
  unfulfillableReason: string | null;
  orderId: string | null;
  convertedQuoteId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface QuoteRow {
  quoteId: string;
  requestId: string;
  validUntil: Date;
}

function makeRequest(partial: Partial<RequestRow>): RequestRow {
  const now = new Date();
  return {
    id: partial.id ?? 'REQ-1',
    customerId: partial.customerId ?? 'usr_customer',
    title: partial.title ?? 'CCTV installation',
    description: partial.description ?? 'Full CCTV setup for my shop',
    deliveryAddress: { city: 'Dar es Salaam', region: 'Dar es Salaam' },
    preferredDeliveryDate: null,
    budgetTzs: 2000000,
    attachments: null,
    status: partial.status ?? 'FULFILLABLE',
    assignedProviderId: null,
    unfulfillableReason: null,
    orderId: partial.orderId ?? null,
    convertedQuoteId: partial.convertedQuoteId ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

function makeQuote(partial: Partial<QuoteRow>): QuoteRow {
  return {
    quoteId: partial.quoteId ?? 'RQT-1',
    requestId: partial.requestId ?? 'REQ-1',
    validUntil: partial.validUntil ?? new Date(Date.now() + 7 * 86400000),
  };
}

function makeFakePrisma(requests: RequestRow[], quotes: QuoteRow[]) {
  const calls: {
    quoteUpdates: Array<{ where: any; data: any }>;
    requestUpdates: Array<{ where: any; data: any }>;
    messages: Array<{ authorType: string; body: string }>;
    outbox: Array<{ eventType: string }>;
    audits: Array<{ action: string; requestId: string; toStatus?: string }>;
  } = { quoteUpdates: [], requestUpdates: [], messages: [], outbox: [], audits: [] };

  const prisma: any = {
    request_Quote: {
      findMany: async ({ where }: any) => {
        // expireQuotes uses validUntil.lt; notifyExpiringQuotes uses gte/lte.
        if (where?.validUntil?.lt) return quotes.filter((q) => q.validUntil < where.validUntil.lt);
        if (where?.validUntil?.gte) {
          const lte = where.validUntil.lte;
          return quotes.filter((q) => q.validUntil >= where.validUntil.gte && q.validUntil <= lte);
        }
        return [];
      },
      update: async ({ where, data }: any) => {
        calls.quoteUpdates.push({ where, data });
        return { quoteId: where.quoteId, ...data };
      },
    },
    request_Request: {
      findUnique: async ({ where }: any) =>
        requests.find((r) => r.id === where.id) ?? null,
      update: async ({ where, data }: any) => {
        calls.requestUpdates.push({ where, data });
        return { id: where.id, ...data };
      },
      updateMany: async () => ({ count: 0 }),
    },
    request_Message: {
      create: async ({ data }: any) => {
        calls.messages.push({ authorType: data.authorType, body: data.body });
        return data;
      },
    },
    request_AccessLink: { updateMany: async () => ({ count: 0 }) },
    request_Source: { updateMany: async () => ({ count: 0 }) },
    request_AuditLog: {
      create: async ({ data }: any) => {
        calls.audits.push({ action: data.action, requestId: data.requestId, toStatus: data.toStatus });
        return data;
      },
    },
    request_OutboxEvent: {
      create: async ({ data }: any) => {
        calls.outbox.push({ eventType: data.eventType });
        return data;
      },
    },
  };
  return { prisma, calls };
}

describe('RequestExpirationSweeper (§4.1)', () => {
  let sweeper: RequestExpirationSweeper;
  let originalPrisma: any;

  beforeEach(() => {
    originalPrisma = (globalThis as any).prisma;
    sweeper = new RequestExpirationSweeper();
  });

  afterEach(() => {
    (globalThis as any).prisma = originalPrisma;
    sweeper.stop();
  });

  it('expires a stale PUBLISHED quote, reassesses the request, posts the STATUS message', async () => {
    const requests = [makeRequest({ id: 'REQ-1', status: 'FULFILLABLE' })];
    const quotes = [makeQuote({ quoteId: 'RQT-1', requestId: 'REQ-1', validUntil: new Date(Date.now() - 1000) })];
    const { prisma, calls } = makeFakePrisma(requests, quotes);
    (globalThis as any).prisma = prisma;

    const stats: SweepStats = await sweeper.runOnce(new Date());

    // Quote swept to EXPIRED.
    expect(stats.quotesExpired).toBe(1);
    expect(calls.quoteUpdates).toHaveLength(1);
    expect(calls.quoteUpdates[0].data.status).toBe('EXPIRED');

    // Request returned to ASSESSING through the entity transition.
    expect(calls.requestUpdates).toHaveLength(1);
    expect(calls.requestUpdates[0].data.status).toBe('ASSESSING');

    // STATUS conversation message posted.
    expect(calls.messages).toEqual([
      { authorType: 'STATUS', body: 'Quote expired — reassessment required' },
    ]);

    // Outbox + audits recorded (QUOTE_EXPIRED + STATUS_CHANGED).
    expect(calls.outbox.map((o) => o.eventType)).toContain('quote.expired');
    const auditActions = calls.audits.map((a) => a.action);
    expect(auditActions).toContain('QUOTE_EXPIRED');
    expect(auditActions).toContain('STATUS_CHANGED');
    expect(calls.audits.find((a) => a.action === 'STATUS_CHANGED')?.toStatus).toBe('ASSESSING');
  });

  it('emits quote.expiring_soon for a quote inside the lead window', async () => {
    const requests = [makeRequest({ id: 'REQ-1', status: 'FULFILLABLE' })];
    // validUntil ~10 minutes out — inside the default 24h lead window.
    const quotes = [makeQuote({ quoteId: 'RQT-1', requestId: 'REQ-1', validUntil: new Date(Date.now() + 10 * 60000) })];
    const { prisma, calls } = makeFakePrisma(requests, quotes);
    (globalThis as any).prisma = prisma;

    const stats: SweepStats = await sweeper.runOnce(new Date());

    expect(stats.expiringSoonNotified).toBe(1);
    expect(calls.outbox.map((o) => o.eventType)).toContain('quote.expiring_soon');
    expect(calls.quoteUpdates).toHaveLength(0);
  });

  it('never reassesses a CONVERTED request', async () => {
    const requests = [makeRequest({ id: 'REQ-1', status: 'CONVERTED', orderId: 'order_1', convertedQuoteId: 'RQT-1' })];
    const quotes = [makeQuote({ quoteId: 'RQT-1', requestId: 'REQ-1', validUntil: new Date(Date.now() - 1000) })];
    const { prisma, calls } = makeFakePrisma(requests, quotes);
    (globalThis as any).prisma = prisma;

    const stats: SweepStats = await sweeper.runOnce(new Date());

    // The stale quote still expires…
    expect(stats.quotesExpired).toBe(1);
    expect(calls.quoteUpdates[0].data.status).toBe('EXPIRED');
    // …but the finished request is left untouched (no status update, no message).
    expect(calls.requestUpdates).toHaveLength(0);
    expect(calls.messages).toHaveLength(0);
    expect(calls.audits.map((a) => a.action)).not.toContain('STATUS_CHANGED');
  });
});