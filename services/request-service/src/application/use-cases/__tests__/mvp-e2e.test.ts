/**
 * Phase 1 §1.7 — End-to-end MVP journey.
 *
 * ONE test walks the complete production spine through the REAL use cases
 * (only persistence + outbox are faked):
 *
 *   create request → customer message → provider assigned → assess FULFILLABLE
 *   → create DRAFT quote (invisible) → publish → customer quote (no internal
 *   costs) → assessment link (hash-only storage) → resolve link (token-gated)
 *   → convert TWICE (exactly one normal Order_Order) → all status transitions
 *   + ORDER conversation message.
 *
 * Every customer-visible serialization is asserted to be free of internal
 * procurement/supplier fields (§B-3).
 */

import { CreateRequestUseCase } from '../create-request.use-case';
import { PostMessageUseCase } from '../post-message.use-case';
import { AssignRequestProviderUseCase } from '../assign-request-provider.use-case';
import { AssessRequestUseCase } from '../assess-request.use-case';
import { CreateQuoteUseCase } from '../create-quote.use-case';
import { PublishQuoteUseCase } from '../publish-quote.use-case';
import { ListCustomerQuotesUseCase } from '../list-customer-quotes.use-case';
import { GenerateAssessmentLinkUseCase } from '../generate-assessment-link.use-case';
import { ResolveAssessmentLinkUseCase } from '../resolve-assessment-link.use-case';
import { ConvertQuoteToOrderUseCase, maysarResellerSellerId } from '../convert-quote-to-order.use-case';
import {
  FakeRequestRepository,
  FakeMessageRepository,
  FakeQuoteRepository,
  FakeAssessmentRepository,
  FakeLinkRepository,
  FakeItemRepository,
  FakeSourceRepository,
  FakeSupplierRepository,
  confirmQuoteSources,
  silenceOutbox,
} from './fakes';

describe('MVP end-to-end journey (§1.7)', () => {
  let requestRepo: FakeRequestRepository;
  let quoteRepo: FakeQuoteRepository;
  let linkRepo: FakeLinkRepository;
  let messageRepo: FakeMessageRepository;
  let itemRepo: FakeItemRepository;
  let sourceRepo: FakeSourceRepository;
  let supplierRepo: FakeSupplierRepository;
  let orders: Map<string, any>;
  let procurements: Map<string, any>;
  let fakePrisma: any;

  const quoteInput = {
    label: 'Recommended',
    items: [
      { description: 'Hikvision-compatible CCTV camera', quantity: 8, unitPriceTzs: 120000 },
      { description: 'Installation service', quantity: 1, unitPriceTzs: 40000 },
    ],
    procurementCostTzs: 900000,
    logisticsCostTzs: 50000,
    sellingPriceTzs: 1050000,
    deliveryDate: new Date(Date.now() + 5 * 86400000).toISOString(),
    validUntil: new Date(Date.now() + 7 * 86400000).toISOString(),
  };

  beforeAll(() => silenceOutbox());

  beforeEach(() => {
    requestRepo = new FakeRequestRepository();
    quoteRepo = new FakeQuoteRepository();
    linkRepo = new FakeLinkRepository();
    messageRepo = new FakeMessageRepository();
    itemRepo = new FakeItemRepository();
    sourceRepo = new FakeSourceRepository();
    supplierRepo = new FakeSupplierRepository();

    orders = new Map();
    procurements = new Map();
    fakePrisma = {
      order_Order: {
        findUnique: async ({ where }: { where: { requestQuoteId?: string; id?: string } }) => {
          if (where.requestQuoteId) {
            for (const o of orders.values()) if (o.requestQuoteId === where.requestQuoteId) return { ...o };
            return null;
          }
          const row = orders.get(where.id ?? '');
          return row ? { ...row } : null;
        },
        create: async ({ data }: { data: any }) => {
          const row = { ...data, items: (data.items?.create ?? []).map((it: any) => ({ ...it })) };
          orders.set(row.id, row);
          return { ...row };
        },
      },
      request_Quote: { update: async ({ where, data }: any) => quoteRepo.updateStatus(where.id, data.status) },
      request_Request: { update: async ({ where, data }: any) => requestRepo.updateStatus(where.id, data.status, data) },
      request_AccessLink: {
        update: async ({ where, data }: any) => linkRepo.updateStatus(where.id, data.status, data),
      },
      request_Procurement: {
        create: async ({ data }: any) => {
          const row = { ...data };
          procurements.set(row.id, row);
          return { ...row };
        },
      },
      $transaction: async (fn: (tx: any) => Promise<any>) => fn(fakePrisma),
    };
  });

  it('customer → request → assess → quote → link → one Maysar order', async () => {
    // ── 1. Customer creates the request (SUBMITTED + STATUS message) ────────
    const create = new CreateRequestUseCase(requestRepo, messageRepo);
    const { request } = await create.execute('usr_customer', {
      title: 'CCTV for my shop',
      description: 'Nahitaji vifaa vya CCTV kwa biashara yangu',
      deliveryAddress: { city: 'Dar es Salaam', region: 'Dar es Salaam', street: 'Mikocheni' },
    });
    expect(request.status).toBe('SUBMITTED');
    expect(messageRepo.rows.some((m) => m.authorType === 'STATUS' && m.requestId === request.id)).toBe(true);

    // ── 2. Customer adds a clarifying message ────────────────────────────────
    const posted = await new PostMessageUseCase(requestRepo, messageRepo).execute(
      { id: 'usr_customer', role: 'customer' },
      request.id,
      { body: 'Ninataki pia usakinishaji wa kudumu' },
    );
    expect(posted.authorType).toBe('CUSTOMER');
    expect(posted.authorId).toBe('usr_customer');

    // ── 3. Platform assigns the Maysar provider ─────────────────────────────
    await new AssignRequestProviderUseCase(requestRepo).execute('usr_admin', request.id, 'usr_provider');
    expect((await requestRepo.findById(request.id))!.assignedProviderId).toBe('usr_provider');

    // ── 4. Provider assesses FULFILLABLE ────────────────────────────────────
    await new AssessRequestUseCase(requestRepo, new FakeAssessmentRepository(), messageRepo).execute(
      'usr_provider', request.id, { decision: 'FULFILLABLE', internalNotes: 'Supplier A confirmed 8 units' },
    );
    expect((await requestRepo.findById(request.id))!.status).toBe('FULFILLABLE');

    // ── 5. Provider drafts a quote — DRAFT is invisible to the customer ──────
    const createdQuote = await new CreateQuoteUseCase(requestRepo, quoteRepo, itemRepo).execute('usr_provider', request.id, quoteInput);
    const beforePublish = await new ListCustomerQuotesUseCase(requestRepo, quoteRepo).execute(request.id);
    expect(beforePublish).toHaveLength(0);

    // ── 6. Publish → request QUOTE_PUBLISHED + QUOTE conversation message ────
    await confirmQuoteSources(itemRepo, sourceRepo, supplierRepo, createdQuote.quote.id);
    await new PublishQuoteUseCase(requestRepo, quoteRepo, messageRepo, itemRepo, sourceRepo).execute('usr_provider', createdQuote.quote.id);
    expect((await requestRepo.findById(request.id))!.status).toBe('QUOTE_PUBLISHED');
    expect(messageRepo.rows.some((m) => m.authorType === 'QUOTE' && m.requestId === request.id)).toBe(true);

    // ── 7. Customer-visible quote: exactly one, free of internal fields ──────
    const visible = await new ListCustomerQuotesUseCase(requestRepo, quoteRepo).execute(request.id);
    expect(visible).toHaveLength(1);
    const customerQuoteJson = JSON.stringify(visible[0]);
    expect(visible[0].sellingPriceTzs).toBe(1050000);
    expect(customerQuoteJson).not.toContain('procurementCostTzs');
    expect(customerQuoteJson).not.toContain('createdByProviderId');
    expect(customerQuoteJson).not.toContain('900000');
    expect(customerQuoteJson).not.toContain('usr_provider');

    // ── 8. Assessment link: raw token returned once; DB stores only the hash ─
    const generateLink = new GenerateAssessmentLinkUseCase(requestRepo, quoteRepo, linkRepo, 'https://maysar.test/api/requests');
    const { token } = await generateLink.execute('usr_provider', createdQuote.quote.id);
    expect(token).toBeTruthy();
    const storedLinks = [...linkRepo.rows.values()];
    expect(storedLinks).toHaveLength(1);
    expect(storedLinks[0].status).toBe('ACTIVE');
    expect(JSON.stringify(storedLinks[0].toJSON())).not.toContain(token); // hash-only storage

    // ── 9. Public token-gated resolve returns the mapped offer ───────────────
    const resolveLink = new ResolveAssessmentLinkUseCase(requestRepo, quoteRepo, linkRepo);
    const resolved = await resolveLink.execute(token);
    expect(resolved.quoteId).toBe(createdQuote.quote.id);
    const resolvedJson = JSON.stringify(resolved);
    expect(resolvedJson).toContain('sellingPriceTzs');
    expect(resolvedJson).not.toContain('procurementCostTzs');

    // ── 10. Convert TWICE → exactly ONE normal Order_Order ───────────────────
    const convert = new ConvertQuoteToOrderUseCase(requestRepo, quoteRepo, linkRepo, messageRepo, resolveLink, fakePrisma, itemRepo, sourceRepo);
    const first = await convert.execute({ token });
    const second = await convert.execute({ token });

    expect(second.created).toBe(false);
    expect(second.orderId).toBe(first.orderId);
    expect(orders.size).toBe(1);

    const order = orders.get(first.orderId);
    expect(order).toBeDefined();
    expect(order.buyerId).toBe('usr_customer');
    expect(order.sellerId).toBe(maysarResellerSellerId());
    expect(order.status).toBe('PENDING');
    expect(order.totalAmount).toBe(1050000);
    expect(order.requestQuoteId).toBe(createdQuote.quote.id);
    expect(order.items).toHaveLength(2);
    expect(order.items[0].description).toContain('CCTV');
    expect(order.items[0].quantity).toBe(8);
    expect(order.items[1].description).toBe('Installation service');

    const orderJson = JSON.stringify(order);
    expect(orderJson).not.toContain('procurement');
    expect(orderJson).not.toContain('900000');

    // ── 11. All side effects: statuses + ORDER conversation message ──────────
    expect((await requestRepo.findById(request.id))!.status).toBe('CONVERTED');
    expect((await requestRepo.findById(request.id))!.orderId).toBe(first.orderId);
    expect((await requestRepo.findById(request.id))!.convertedQuoteId).toBe(createdQuote.quote.id);
    expect((await quoteRepo.findById(createdQuote.quote.id))!.status).toBe('CONVERTED');
    expect((await linkRepo.findById(storedLinks[0].id))!.status).toBe('USED');
    expect(messageRepo.rows.some((m) => m.authorType === 'ORDER' && m.requestId === request.id)).toBe(true);

    // ── 12. The created order is readable as a plain order query (unique key) ─
    const byQuote = await fakePrisma.order_Order.findUnique({ where: { requestQuoteId: createdQuote.quote.id } });
    expect(byQuote.id).toBe(first.orderId);
  });
});