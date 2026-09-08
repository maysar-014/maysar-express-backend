/**
 * Request → Order conversion — idempotency (Phase 1 §1.6 acceptance).
 */

import { CreateRequestUseCase } from '../create-request.use-case';
import { AssignRequestProviderUseCase } from '../assign-request-provider.use-case';
import { AssessRequestUseCase } from '../assess-request.use-case';
import { CreateQuoteUseCase } from '../create-quote.use-case';
import { PublishQuoteUseCase } from '../publish-quote.use-case';
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

describe('ConvertQuoteToOrderUseCase (§1.6)', () => {
  let requestRepo: FakeRequestRepository;
  let quoteRepo: FakeQuoteRepository;
  let linkRepo: FakeLinkRepository;
  let itemRepo: FakeItemRepository;
  let sourceRepo: FakeSourceRepository;
  let supplierRepo: FakeSupplierRepository;
  let messageRepo: FakeMessageRepository;
  let generateLink: GenerateAssessmentLinkUseCase;
  let resolveLink: ResolveAssessmentLinkUseCase;
  let convert: ConvertQuoteToOrderUseCase;

  // Minimal fake prisma: order_Order keyed by requestQuoteId unique index.
  let orders: Map<string, any>;
  let procurements: Map<string, any>;
  let fakePrisma: any;

  const quoteInput = {
    label: 'Recommended',
    items: [
      { description: 'CCTV camera', quantity: 8, unitPriceTzs: 120000 },
      { description: 'Installation service', quantity: 1, unitPriceTzs: 40000 },
    ],
    procurementCostTzs: 900000,
    logisticsCostTzs: 50000,
    sellingPriceTzs: 1050000,
    deliveryDate: new Date(Date.now() + 5 * 86400000).toISOString(),
    validUntil: new Date(Date.now() + 7 * 86400000).toISOString(),
  };

  beforeAll(() => silenceOutbox());

  beforeEach(async () => {
    requestRepo = new FakeRequestRepository();
    quoteRepo = new FakeQuoteRepository();
    linkRepo = new FakeLinkRepository();
    itemRepo = new FakeItemRepository();
    sourceRepo = new FakeSourceRepository();
    supplierRepo = new FakeSupplierRepository();
    messageRepo = new FakeMessageRepository();
    generateLink = new GenerateAssessmentLinkUseCase(requestRepo, quoteRepo, linkRepo, 'https://x.test/api/request');
    resolveLink = new ResolveAssessmentLinkUseCase(requestRepo, quoteRepo, linkRepo);

    orders = new Map();
    procurements = new Map();
    fakePrisma = {
      order_Order: {
        findUnique: async ({ where }: { where: { requestQuoteId?: string; id?: string } }) => {
          if (where.requestQuoteId) {
            for (const o of orders.values()) if (o.requestQuoteId === where.requestQuoteId) return { ...o };
            return null;
          }
          return orders.get(where.id ?? '') ? { ...orders.get(where.id!) } : null;
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

    convert = new ConvertQuoteToOrderUseCase(requestRepo, quoteRepo, linkRepo, messageRepo, resolveLink, fakePrisma, itemRepo, sourceRepo);
  });

  async function seedToLink(): Promise<string> {
    const create = new CreateRequestUseCase(requestRepo, messageRepo);
    const requestId = (await create.execute('usr_customer', {
      title: 'CCTV for my shop',
      description: 'Nahitaji vifaa vya CCTV kwa biashara yangu',
      deliveryAddress: { city: 'Dar es Salaam', region: 'Dar es Salaam', street: 'Mikocheni' },
    })).request.id;

    await new AssignRequestProviderUseCase(requestRepo).execute('usr_admin', requestId, 'usr_provider');
    await new AssessRequestUseCase(requestRepo, new FakeAssessmentRepository(), messageRepo).execute(
      'usr_provider', requestId, { decision: 'FULFILLABLE', internalNotes: 'Supplier A confirmed stock' },
    );
    const quote = await new CreateQuoteUseCase(requestRepo, quoteRepo, itemRepo).execute('usr_provider', requestId, quoteInput);
    await confirmQuoteSources(itemRepo, sourceRepo, supplierRepo, quote.quote.id);
    await new PublishQuoteUseCase(requestRepo, quoteRepo, messageRepo, itemRepo, sourceRepo).execute('usr_provider', quote.quote.id);

    const { token } = await generateLink.execute('usr_provider', quote.quote.id);
    return token;
  }

  it('convert once → normal Order_Order + items + all status transitions', async () => {
    const token = await seedToLink();
    const result = await convert.execute({ token });

    expect(result.created).toBe(true);
    const order = orders.get(result.orderId);
    expect(order).toBeDefined();
    // A NORMAL order: same table/shape the order-service writes.
    expect(order.buyerId).toBe('usr_customer');
    expect(order.sellerId).toBe(maysarResellerSellerId());
    expect(order.status).toBe('PENDING');
    expect(order.totalAmount).toBe(1050000);
    expect(order.requestQuoteId).toBe(result.quoteId);
    expect(order.items).toHaveLength(2);
    expect(order.items[0].quantity).toBe(8);

    const request = await requestRepo.findById(result.requestId);
    expect(request!.status).toBe('CONVERTED');
    expect(request!.orderId).toBe(result.orderId);
    expect(request!.convertedQuoteId).toBe(result.quoteId);

    const quote = await quoteRepo.findById(result.quoteId);
    expect(quote!.status).toBe('CONVERTED');

    const links = [...linkRepo.rows.values()];
    expect(links.every((l) => l.status === 'USED')).toBe(true);
  });

  it('convert twice → exactly ONE order, same id (idempotency)', async () => {
    const token = await seedToLink();

    const first = await convert.execute({ token });
    const second = await convert.execute({ token });

    expect(second.orderId).toBe(first.orderId);
    expect(second.created).toBe(false);
    expect(orders.size).toBe(1);
  });

  it('procurement cost appears NOWHERE in the created order (§B-3)', async () => {
    const token = await seedToLink();
    const result = await convert.execute({ token });
    const json = JSON.stringify(orders.get(result.orderId));
    expect(json).not.toContain('900000'); // procurementCostTzs
    expect(json).not.toContain('procurement');
  });

  it('conversion of an expired quote → QUOTE_NOT_AVAILABLE (gate re-validated)', async () => {
    const token = await seedToLink();
    const resolved = await resolveLink.execute(token);
    const quote = (await quoteRepo.findById(resolved.quoteId))!;
    quote.markExpired();
    await quoteRepo.save(quote);

    await expect(convert.execute({ token })).rejects.toMatchObject({ code: 'QUOTE_NOT_AVAILABLE' });
    expect(orders.size).toBe(0);
  });
});