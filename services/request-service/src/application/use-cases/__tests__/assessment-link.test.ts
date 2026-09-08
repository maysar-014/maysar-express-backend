/**
 * Fulfillment gate + secure link (Phase 1 §1.5 acceptance).
 */

import { CreateRequestUseCase } from '../create-request.use-case';
import { AssignRequestProviderUseCase } from '../assign-request-provider.use-case';
import { AssessRequestUseCase } from '../assess-request.use-case';
import { CreateQuoteUseCase } from '../create-quote.use-case';
import { PublishQuoteUseCase } from '../publish-quote.use-case';
import { GenerateAssessmentLinkUseCase } from '../generate-assessment-link.use-case';
import { ResolveAssessmentLinkUseCase, LINK_ERRORS } from '../resolve-assessment-link.use-case';
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
import { ForbiddenError, ValidationError } from '../../../../../../shared/errors/api-errors';

describe('Fulfillment gate + secure link (§1.5)', () => {
  let requestRepo: FakeRequestRepository;
  let quoteRepo: FakeQuoteRepository;
  let linkRepo: FakeLinkRepository;
  let messageRepo: FakeMessageRepository;
  let generateLink: GenerateAssessmentLinkUseCase;
  let resolveLink: ResolveAssessmentLinkUseCase;

  const quoteInput = {
    label: 'Recommended',
    items: [{ description: 'CCTV kit', quantity: 1, unitPriceTzs: 1000000 }],
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
    messageRepo = new FakeMessageRepository();
    generateLink = new GenerateAssessmentLinkUseCase(requestRepo, quoteRepo, linkRepo, 'https://maysar.test/api/request');
    resolveLink = new ResolveAssessmentLinkUseCase(requestRepo, quoteRepo, linkRepo);
  });

  /** Drives the flow up to the requested state; returns the created quote id. */
  async function seed(
    requestRepo2: FakeRequestRepository,
    target: 'FULFILLABLE' | 'QUOTE_PUBLISHED',
    itemRepo2: FakeItemRepository = new FakeItemRepository(),
    sourceRepo2: FakeSourceRepository = new FakeSourceRepository(),
    supplierRepo2: FakeSupplierRepository = new FakeSupplierRepository(),
  ): Promise<string> {
    const create = new CreateRequestUseCase(requestRepo2, messageRepo);
    const requestId = (await create.execute('usr_customer', {
      title: 'T',
      description: 'Need CCTV',
      deliveryAddress: { city: 'X', region: 'Y' },
    })).request.id;
    await new AssignRequestProviderUseCase(requestRepo2).execute('usr_admin', requestId, 'usr_provider');
    await new AssessRequestUseCase(requestRepo2, new FakeAssessmentRepository(), messageRepo).execute(
      'usr_provider', requestId, { decision: 'FULFILLABLE' },
    );
    const quote = await new CreateQuoteUseCase(requestRepo2, quoteRepo, itemRepo2).execute('usr_provider', requestId, quoteInput);
    if (target === 'QUOTE_PUBLISHED') {
      await confirmQuoteSources(itemRepo2, sourceRepo2, supplierRepo2, quote.quote.id);
      await new PublishQuoteUseCase(requestRepo2, quoteRepo, messageRepo, itemRepo2, sourceRepo2).execute('usr_provider', quote.quote.id);
    }
    return quote.quote.id;
  }

  it('gate: link generation blocked while the quote is unpublished', async () => {
    const quoteId = await seed(requestRepo, 'FULFILLABLE');
    await expect(generateLink.execute('usr_provider', quoteId)).rejects.toMatchObject({ httpStatus: 400 });
  });

  it('gate: link generation requires PUBLISHED quote + QUOTE_PUBLISHED request — then succeeds', async () => {
    const quoteId = await seed(requestRepo, 'QUOTE_PUBLISHED');
    const result = await generateLink.execute('usr_provider', quoteId);
    expect(result.url).toContain('/requests/assess/');
    expect(result.token).toHaveLength(43);
  });

  it('gate: a non-creator provider cannot generate the link', async () => {
    const quoteId = await seed(requestRepo, 'QUOTE_PUBLISHED');
    await expect(generateLink.execute('usr_other_provider', quoteId)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('raw token shown once — only the hash is persisted (§B-7)', async () => {
    const quoteId = await seed(requestRepo, 'QUOTE_PUBLISHED');
    const result = await generateLink.execute('usr_provider', quoteId);
    const stored = [...linkRepo.rows.values()];
    expect(stored).toHaveLength(1);
    expect(JSON.stringify(stored[0].toJSON())).not.toContain(result.token);
    expect(stored[0].tokenHash).toHaveLength(64);
  });

  it('resolve returns the mapped customer quote (no internal fields)', async () => {
    const quoteId = await seed(requestRepo, 'QUOTE_PUBLISHED');
    const { token } = await generateLink.execute('usr_provider', quoteId);

    const resolved = await resolveLink.execute(token);
    expect(resolved.customerId).toBe('usr_customer');
    expect(resolved.quote.sellingPriceTzs).toBe(1050000);
    const json = JSON.stringify(resolved.quote);
    expect(json).not.toContain('procurementCostTzs');
    expect(json).not.toContain('usr_provider');
  });

  it('used link → LINK_ALREADY_USED', async () => {
    const quoteId = await seed(requestRepo, 'QUOTE_PUBLISHED');
    const { token } = await generateLink.execute('usr_provider', quoteId);

    const { hashToken } = await import('../../../domain/entities/request-access-link.entity');
    const link = (await linkRepo.findByHash(hashToken(token)))!;
    link.markUsed();
    await linkRepo.save(link);
    await expect(resolveLink.execute(token)).rejects.toMatchObject({ code: LINK_ERRORS.ALREADY_USED });
  });

  it('revoked link → LINK_REVOKED', async () => {
    const quoteId = await seed(requestRepo, 'QUOTE_PUBLISHED');
    const fresh = await generateLink.execute('usr_provider', quoteId);

    const { hashToken } = await import('../../../domain/entities/request-access-link.entity');
    const link = (await linkRepo.findByHash(hashToken(fresh.token)))!;
    link.revoke();
    await linkRepo.save(link);
    await expect(resolveLink.execute(fresh.token)).rejects.toMatchObject({ code: LINK_ERRORS.REVOKED });
  });

  it('expired link → LINK_EXPIRED', async () => {
    const quoteId = await seed(requestRepo, 'QUOTE_PUBLISHED');
    // Construct the expired link directly (create() rejects past expiries by
    // design) — mirrors the Phase 4 sweeper marking links EXPIRED.
    const { RequestAccessLink, generateRawToken, hashToken } = await import('../../../domain/entities/request-access-link.entity');
    const raw = generateRawToken();
    const expired = new RequestAccessLink({
      id: 'ral_expired',
      requestId: (await quoteRepo.findById(quoteId))!.requestId,
      quoteId,
      customerId: 'usr_customer',
      tokenHash: hashToken(raw),
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() - 1000),
      usedAt: null,
      createdAt: new Date(),
    });
    await linkRepo.save(expired);
    await expect(resolveLink.execute(raw)).rejects.toMatchObject({ code: LINK_ERRORS.EXPIRED });
  });

  it('unknown token → LINK_NOT_FOUND', async () => {
    await expect(resolveLink.execute('no-such-token')).rejects.toMatchObject({ code: LINK_ERRORS.NOT_FOUND });
  });

  it('generateLink rejects a TTL that is already expired', async () => {
    const quoteId = await seed(requestRepo, 'QUOTE_PUBLISHED');
    await expect(generateLink.execute('usr_provider', quoteId, -1000)).rejects.toThrow(ValidationError);
  });
});