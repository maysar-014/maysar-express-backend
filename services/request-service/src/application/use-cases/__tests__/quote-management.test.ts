/**
 * Quote management - create/publish + internal-cost hiding (Phase 1 §1.4).
 */

import { CreateRequestUseCase } from '../create-request.use-case';
import { AssignRequestProviderUseCase } from '../assign-request-provider.use-case';
import { AssessRequestUseCase } from '../assess-request.use-case';
import { CreateQuoteUseCase } from '../create-quote.use-case';
import { PublishQuoteUseCase } from '../publish-quote.use-case';
import { ListCustomerQuotesUseCase } from '../list-customer-quotes.use-case';
import {
  FakeRequestRepository,
  FakeMessageRepository,
  FakeQuoteRepository,
  FakeAssessmentRepository,
  FakeItemRepository,
  FakeSourceRepository,
  FakeSupplierRepository,
  confirmQuoteSources,
  silenceOutbox,
} from './fakes';
import { ForbiddenError } from '../../../../../../shared/errors/api-errors';

describe('Quote management (§1.4)', () => {
  let requestRepo: FakeRequestRepository;
  let quoteRepo: FakeQuoteRepository;
  let messageRepo: FakeMessageRepository;
  let itemRepo: FakeItemRepository;
  let sourceRepo: FakeSourceRepository;
  let supplierRepo: FakeSupplierRepository;
  let requestId: string;
  let createQuote: CreateQuoteUseCase;
  let publishQuote: PublishQuoteUseCase;

  const quoteInput = {
    label: 'Recommended',
    items: [{ description: 'CCTV kit', quantity: 1, unitPriceTzs: 1000000 }],
    procurementCostTzs: 900000,
    logisticsCostTzs: 50000,
    sellingPriceTzs: 1050000,
    deliveryDate: new Date(Date.now() + 5 * 86400000).toISOString(),
    validUntil: new Date(Date.now() + 7 * 86400000).toISOString(),
    explanation: 'Best balance of price and delivery',
  };

  beforeAll(() => silenceOutbox());

  beforeEach(async () => {
    requestRepo = new FakeRequestRepository();
    quoteRepo = new FakeQuoteRepository();
    messageRepo = new FakeMessageRepository();
    itemRepo = new FakeItemRepository();
    sourceRepo = new FakeSourceRepository();
    supplierRepo = new FakeSupplierRepository();

    const create = new CreateRequestUseCase(requestRepo, messageRepo);
    requestId = (await create.execute('usr_customer', {
      title: 'T',
      description: 'Need CCTV',
      deliveryAddress: { city: 'X', region: 'Y' },
    })).request.id;

    await new AssignRequestProviderUseCase(requestRepo).execute('usr_admin', requestId, 'usr_provider');
    await new AssessRequestUseCase(requestRepo, new FakeAssessmentRepository(), messageRepo).execute(
      'usr_provider',
      requestId,
      { decision: 'FULFILLABLE' },
    );

    createQuote = new CreateQuoteUseCase(requestRepo, quoteRepo, itemRepo);
    publishQuote = new PublishQuoteUseCase(requestRepo, quoteRepo, messageRepo, itemRepo, sourceRepo);
  });
  it('publish below cost → rejected by the entity invariant', async () => {
    // The invariant fires at quote creation - the DRAFT row is never persisted.
    await expect(
      createQuote.execute('usr_provider', requestId, {
        ...quoteInput,
        sellingPriceTzs: 900000, // below 900000 + 50000
      }),
    ).rejects.toThrow('must be ≥ procurement + logistics');
  });

  it('publish transitions request to QUOTE_PUBLISHED + posts a QUOTE message', async () => {
    const created = await createQuote.execute('usr_provider', requestId, quoteInput);
    await confirmQuoteSources(itemRepo, sourceRepo, supplierRepo, created.quote.id);
    const result = await publishQuote.execute('usr_provider', created.quote.id);
    expect(result.quote.status).toBe('PUBLISHED');
    const request = await requestRepo.findById(requestId);
    expect(request!.status).toBe('QUOTE_PUBLISHED');
    expect((await messageRepo.listByRequest(requestId)).some((m) => m.authorType === 'QUOTE')).toBe(true);
  });

  it('DRAFT quotes are invisible to the customer; published ones are mapped', async () => {
    const list = new ListCustomerQuotesUseCase(requestRepo, quoteRepo);

    // Before publish: only a DRAFT exists → empty customer view.
    const created = await createQuote.execute('usr_provider', requestId, quoteInput);
    expect(await list.execute(requestId)).toHaveLength(0);

    await confirmQuoteSources(itemRepo, sourceRepo, supplierRepo, created.quote.id);
    await publishQuote.execute('usr_provider', created.quote.id);
    const visible = await list.execute(requestId);
    expect(visible).toHaveLength(1);
    expect(visible[0].quoteId).toBe(created.quote.id);
  });

  it('customer payload structurally omits internal fields (§B-3 key-absence)', async () => {
    const created = await createQuote.execute('usr_provider', requestId, quoteInput);
    await confirmQuoteSources(itemRepo, sourceRepo, supplierRepo, created.quote.id);
    await publishQuote.execute('usr_provider', created.quote.id);

    const visible = await new ListCustomerQuotesUseCase(requestRepo, quoteRepo).execute(requestId);
    const json = JSON.stringify(visible);
    expect(visible[0]).not.toHaveProperty('procurementCostTzs');
    expect(visible[0]).not.toHaveProperty('createdByProviderId');
    expect(json).not.toContain('procurementCostTzs');
    expect(json).not.toContain('usr_provider');
    expect(json).toContain('sellingPriceTzs');
  });
});

describe('Published-quote immutability (§B-6)', () => {
  it('a change creates a NEW version + supersedes the old one', async () => {
    silenceOutbox();
    const requestRepo = new FakeRequestRepository();
    const quoteRepo = new FakeQuoteRepository();
    const messageRepo = new FakeMessageRepository();
    const itemRepo = new FakeItemRepository();
    const sourceRepo = new FakeSourceRepository();
    const supplierRepo = new FakeSupplierRepository();

    const requestId = (await new CreateRequestUseCase(requestRepo, messageRepo).execute('usr_customer', {
      title: 'T',
      description: 'Need CCTV',
      deliveryAddress: { city: 'X', region: 'Y' },
    })).request.id;

    await new AssignRequestProviderUseCase(requestRepo).execute('usr_admin', requestId, 'usr_provider');
    await new AssessRequestUseCase(requestRepo, new FakeAssessmentRepository(), messageRepo).execute(
      'usr_provider', requestId, { decision: 'FULFILLABLE' },
    );

    const input = {
      label: 'Recommended',
      items: [{ description: 'CCTV kit', quantity: 1, unitPriceTzs: 1000000 }],
      procurementCostTzs: 900000,
      logisticsCostTzs: 50000,
      sellingPriceTzs: 1050000,
      deliveryDate: new Date(Date.now() + 5 * 86400000).toISOString(),
      validUntil: new Date(Date.now() + 7 * 86400000).toISOString(),
    };

    const original = await new CreateQuoteUseCase(requestRepo, quoteRepo, itemRepo).execute('usr_provider', requestId, input);
    await confirmQuoteSources(itemRepo, sourceRepo, supplierRepo, original.quote.id);
    await new PublishQuoteUseCase(requestRepo, quoteRepo, messageRepo, itemRepo, sourceRepo).execute('usr_provider', original.quote.id);

    // Provider revises the offer via a SAME-label revision: NEW quote row + old one
    // SUPERSEDED on publish. (§B-6 - the old price must never remain purchasable.)
    const revised = await new CreateQuoteUseCase(requestRepo, quoteRepo, itemRepo).execute('usr_provider', requestId, {
      ...input,
      label: 'Recommended',
      sellingPriceTzs: 1020000,
    });
    await confirmQuoteSources(itemRepo, sourceRepo, supplierRepo, revised.quote.id);
    await new PublishQuoteUseCase(requestRepo, quoteRepo, messageRepo, itemRepo, sourceRepo).execute('usr_provider', revised.quote.id);

    // Phase 3 - a DIFFERENT label is a parallel option, not a revision: publishing
    // 'Fastest' must NOT supersede the revised 'Recommended' offer.
    const fastest = await new CreateQuoteUseCase(requestRepo, quoteRepo, itemRepo).execute('usr_provider', requestId, {
      ...input,
      label: 'Fastest',
      sellingPriceTzs: 1100000,
    });
    await confirmQuoteSources(itemRepo, sourceRepo, supplierRepo, fastest.quote.id);
    await new PublishQuoteUseCase(requestRepo, quoteRepo, messageRepo, itemRepo, sourceRepo).execute('usr_provider', fastest.quote.id);

    expect(revised.quote.id).not.toBe(original.quote.id);
    expect(fastest.quote.id).not.toBe(revised.quote.id);
    const oldRow = await quoteRepo.findById(original.quote.id);
    expect(oldRow!.status).toBe('SUPERSEDED');
    expect(oldRow!.sellingPriceTzs).toBe(1050000); // old price preserved, untouched

    // The customer sees only the active offers - the superseded price must never
    // remain purchasable (§B-6), while the two concurrent options(Recommended +
    // Fastest)  remain visible - the comparison view is for concurrent options,
    // not superseded ones.
    const visible = await new ListCustomerQuotesUseCase(requestRepo, quoteRepo).execute(requestId);
    expect(visible.map((q) => q.label).sort()).toEqual(['Fastest', 'Recommended']);
  });
});