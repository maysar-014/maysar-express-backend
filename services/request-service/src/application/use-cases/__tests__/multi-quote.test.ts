/**
 * Phase 3 - Multiple Quote Options acceptance.
 *
 * A request can hold several PUBLISHED quotes simultaneously (distinct labels),
 * each a meaningful trade-off. Exactly one can be converted; converting one
 * supersedes every sibling PUBLISHED quote (§B-6 within an option's version line;
 * concurrent options stay live until conversion).
 */

import { CreateRequestUseCase } from '../create-request.use-case';
import { AssignRequestProviderUseCase } from '../assign-request-provider.use-case';
import { AssessRequestUseCase } from '../assess-request.use-case';
import { CreateQuoteUseCase } from '../create-quote.use-case';
import { PublishQuoteUseCase } from '../publish-quote.use-case';
import { GenerateAssessmentLinkUseCase } from '../generate-assessment-link.use-case';
import { ResolveAssessmentLinkUseCase } from '../resolve-assessment-link.use-case';
import { ConvertQuoteToOrderUseCase } from '../convert-quote-to-order.use-case';
import { RegisterSupplierUseCase } from '../register-supplier.use-case';
import { SetItemSourceUseCase } from '../set-item-source.use-case';
import { ListCustomerQuotesUseCase } from '../list-customer-quotes.use-case';
import {
  FakeRequestRepository,
  FakeMessageRepository,
  FakeQuoteRepository,
  FakeAssessmentRepository,
  FakeLinkRepository,
  FakeItemRepository,
  FakeSourceRepository,
  FakeSupplierRepository,
  silenceOutbox,
} from './fakes';

async function confirmQuoteSources(
  itemRepo: FakeItemRepository,
  sourceRepo: FakeSourceRepository,
  supplierRepo: FakeSupplierRepository,
  itemIds: string[],
): Promise<void> {
  const supplier = await new RegisterSupplierUseCase(supplierRepo).create({
    name: 'Ops supplier',
    contact: { phone: '+255700000000' },
  });
  for (const itemId of itemIds) {
    await new SetItemSourceUseCase(itemRepo, sourceRepo, supplierRepo).attach(itemId, {
      supplierId: supplier.id,
      agreedPriceTzs: 900000,
      availability: 'CONFIRMED',
    });
  }
}

function makeQuoteInput(label: string, sellingPrice: number) {
  return {
    label,
    items: [{ description: 'CCTV kit', quantity: 1, unitPriceTzs:  1000000 }],
    procurementCostTzs:  900000,
    logisticsCostTzs:  50000,
    sellingPriceTzs: sellingPrice,
    deliveryDate: new Date(Date.now() + 5 * 86400000).toISOString(),
    validUntil: new Date(Date.now() + 7 * 86400000).toISOString(),
    explanation: label === 'Best Value' ? 'The economical option.' : label === 'Fastest' ? 'Delivered soonest.' : 'Balanced price, quality and speed.',
  };
}

function makeFakePrisma() {
  const orderCreates: any[] = [];
  const fakePrisma = {
    order_Order: {
      findUnique: async ({ where }: any) =>
        orderCreates.find((o) => o.requestQuoteId === where?.requestQuoteId) ?? null,
      create: async ({ data }: any) => { orderCreates.push(data); return { ...data }; },
    },
    request_Quote: { update: async () => undefined, updateMany: async () => undefined },
    request_Request: { update: async () => undefined },
    request_AccessLink: { update: async () => undefined },
    request_Procurement: { create: async ({ data }: any) => ({ ...data }) },
    $transaction: async (fn: any) => fn(fakePrisma),
  };
  return { fakePrisma, orderCreates };
}

describe('Phase 3 - Multiple quote options', () => {
  beforeAll(() => silenceOutbox());

  let requestRepo: FakeRequestRepository;
  let quoteRepo: FakeQuoteRepository;
  let messageRepo: FakeMessageRepository;
  let itemRepo: FakeItemRepository;
  let sourceRepo: FakeSourceRepository;
  let supplierRepo: FakeSupplierRepository;
  let linkRepo: FakeLinkRepository;
  let requestId: string;

  beforeEach(async () => {
    requestRepo = new FakeRequestRepository();
    quoteRepo = new FakeQuoteRepository();
    messageRepo = new FakeMessageRepository();
    itemRepo = new FakeItemRepository();
    sourceRepo = new FakeSourceRepository();
    supplierRepo = new FakeSupplierRepository();
    linkRepo = new FakeLinkRepository();

    requestId = (await new CreateRequestUseCase(requestRepo, messageRepo).execute('usr_customer', {
      title: 'CCTV for business',
      description: 'Need a complete CCTV setup',
      deliveryAddress: { city: 'Dar es Salaam', region: 'Dar es Salaam' },
    })).request.id;

    await new AssignRequestProviderUseCase(requestRepo).execute('usr_admin', requestId, 'usr_provider');
    await new AssessRequestUseCase(requestRepo, new FakeAssessmentRepository(), messageRepo).execute(
      'usr_provider', requestId, { decision: 'FULFILLABLE' },
    );
  });

  it('three published quotes (distinct labels) → customer sees three mapped options', async () => {
    const createQuote = new CreateQuoteUseCase(requestRepo, quoteRepo, itemRepo);
    const publishQuote = new PublishQuoteUseCase(requestRepo, quoteRepo, messageRepo, itemRepo, sourceRepo);

    const a = await createQuote.execute('usr_provider', requestId, makeQuoteInput('Best Value', 1050000));
    await confirmQuoteSources(itemRepo, sourceRepo, supplierRepo, a.itemIds);
    await publishQuote.execute('usr_provider', a.quote.id);

    const b = await createQuote.execute('usr_provider', requestId, makeQuoteInput('Recommended', 1100000));
    await confirmQuoteSources(itemRepo, sourceRepo, supplierRepo, b.itemIds);
    await publishQuote.execute('usr_provider', b.quote.id);

    const c = await createQuote.execute('usr_provider', requestId, makeQuoteInput('Fastest', 1200000));
    await confirmQuoteSources(itemRepo, sourceRepo, supplierRepo, c.itemIds);
    await publishQuote.execute('usr_provider', c.quote.id);

    // All three remain live - none supersedes a different label.

    const visible = await new ListCustomerQuotesUseCase(requestRepo, quoteRepo).execute(requestId);
    expect(visible.map((q) => q.label).sort()).toEqual(['Best Value', 'Fastest', 'Recommended']);
    const json = JSON.stringify(visible);
    expect(json).toContain('The economical option.');  // explanation customer-visible
    expect(json).toContain('Delivered soonest.');
    expect(json).not.toContain('procurementCostTzs');
    expect(visible[0]).not.toHaveProperty('createdByProviderId');

    // Publishing a DRAFT quote with the SAME label (a revision) supersedes
    // only that option's prior version - Recommended v2 replaces v1.

    const b2 = await createQuote.execute('usr_provider', requestId, makeQuoteInput('Recommended',1080000));
    await confirmQuoteSources(itemRepo, sourceRepo, supplierRepo, b2.itemIds);
    await publishQuote.execute('usr_provider', b2.quote.id);

    const visible2 = await new ListCustomerQuotesUseCase(requestRepo, quoteRepo).execute(requestId);
    expect(visible2.map((q) => q.label).sort()).toEqual(['Best Value', 'Fastest', 'Recommended']);
    const oldB = await quoteRepo.findById(b.quote.id);
    expect(oldB!.status).toBe('SUPERSEDED');
    const newB = await quoteRepo.findById(b2.quote.id);
    expect(newB!.status).toBe('PUBLISHED');
  });

  it('converting one quote supersedes the sibling quotes and creates exactly one order', async () => {
    const createQuote = new CreateQuoteUseCase(requestRepo, quoteRepo, itemRepo);
    const publishQuote = new PublishQuoteUseCase(requestRepo, quoteRepo, messageRepo, itemRepo, sourceRepo);
    const generateLink = new GenerateAssessmentLinkUseCase(requestRepo, quoteRepo, linkRepo, 'https://x.test');
    const resolveLink = new ResolveAssessmentLinkUseCase(requestRepo, quoteRepo, linkRepo);

    const a = await createQuote.execute('usr_provider', requestId, makeQuoteInput('Best Value', 1050000));
    await confirmQuoteSources(itemRepo, sourceRepo, supplierRepo, a.itemIds);
    await publishQuote.execute('usr_provider', a.quote.id);

    const b = await createQuote.execute('usr_provider', requestId, makeQuoteInput('Recommended', 1100000));
    await confirmQuoteSources(itemRepo, sourceRepo, supplierRepo, b.itemIds);
    await publishQuote.execute('usr_provider', b.quote.id);

    const c = await createQuote.execute('usr_provider', requestId, makeQuoteInput('Fastest', 1200000));
    await confirmQuoteSources(itemRepo, sourceRepo, supplierRepo, c.itemIds);
    await publishQuote.execute('usr_provider', c.quote.id);

    const { token: tokenB } = await generateLink.execute('usr_provider', b.quote.id);
    const { fakePrisma, orderCreates } = makeFakePrisma();
    const convert = new ConvertQuoteToOrderUseCase(
      requestRepo, quoteRepo, linkRepo, messageRepo, resolveLink, fakePrisma, itemRepo, sourceRepo,
    );
    const result = await convert.execute({ token: tokenB });
    expect(result.created).toBe(true);
    expect(orderCreates).toHaveLength(1);

    // B → CONVERTED; A and C → SUPERSEDED (exactly one offer becomes an order).
    const oldA = await quoteRepo.findById(a.quote.id);
    const newB = await quoteRepo.findById(b.quote.id);
    const oldC = await quoteRepo.findById(c.quote.id);
    expect(oldA!.status).toBe('SUPERSEDED');
    expect(newB!.status).toBe('CONVERTED');
    expect(oldC!.status).toBe('SUPERSEDED');

    // No live offers remain after conversion.

    const visible = await new ListCustomerQuotesUseCase(requestRepo, quoteRepo).execute(requestId);
    expect(visible).toHaveLength(0);

    // A repeat conversion is idempotent - still exactly one order.

    const again = await convert.execute({ token: tokenB });
    expect(again.created).toBe(false);
    expect(orderCreates).toHaveLength(1);
  });

  it('a superseded sibling quote can no longer be converted', async () => {
    const createQuote = new CreateQuoteUseCase(requestRepo, quoteRepo, itemRepo);
    const publishQuote = new PublishQuoteUseCase(requestRepo, quoteRepo, messageRepo, itemRepo, sourceRepo);
    const generateLink = new GenerateAssessmentLinkUseCase(requestRepo, quoteRepo, linkRepo, 'https://x.test');
    const resolveLink = new ResolveAssessmentLinkUseCase(requestRepo, quoteRepo, linkRepo);

    const a = await createQuote.execute('usr_provider', requestId, makeQuoteInput('Best Value', 1050000));
    await confirmQuoteSources(itemRepo, sourceRepo, supplierRepo, a.itemIds);
    await publishQuote.execute('usr_provider', a.quote.id);

    const b = await createQuote.execute('usr_provider', requestId, makeQuoteInput('Recommended', 1100000));
    await confirmQuoteSources(itemRepo, sourceRepo, supplierRepo, b.itemIds);
    await publishQuote.execute('usr_provider', b.quote.id);

    const { token: tokenA } = await generateLink.execute('usr_provider', a.quote.id);
    const { token: tokenB } = await generateLink.execute('usr_provider', b.quote.id);
    const { fakePrisma } = makeFakePrisma();

    const convert = new ConvertQuoteToOrderUseCase(
      requestRepo, quoteRepo, linkRepo, messageRepo, resolveLink, fakePrisma, itemRepo, sourceRepo,
    );
    await convert.execute({ token: tokenB });

    // A is SUPERSEDED + the request is CONVERTED - the link gate refuses it.
    await expect(convert.execute({ token: tokenA })).rejects.toThrow();
    await expect(resolveLink.execute(tokenA)).rejects.toThrow(/no longer|not available/i);
  });
});

