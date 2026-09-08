/**
 * Demand analytics acceptance (Phase 5 §5.3 growth loop).
 *
 * Seeds a realistic request book through the fakes and asserts every
 * aggregate the backlog requires:
 *   fulfillment rate, quote-acceptance rate, average margin on accepted
 *   quotes, top unfulfillable reasons, category clusters.
 */

import { GetDemandAnalyticsUseCase } from '../get-demand-analytics.use-case';
import { FakeRequestRepository, FakeQuoteRepository } from './fakes';
import { RequestEntity } from '../../../domain/entities/request.entity';
import { RequestQuote } from '../../../domain/entities/request-quote.entity';

describe('Demand analytics (§5.3)', () => {
  let requestRepo: FakeRequestRepository;
  let quoteRepo: FakeQuoteRepository;
  let analytics: GetDemandAnalyticsUseCase;

  const futureDays = (days: number) => new Date(Date.now() + days * 86400000);
  let seq = 0;

  const makeRequest = async (title: string, description: string): Promise<RequestEntity> => {
    const req = RequestEntity.create({
      customerId: `cust-${++seq}`,
      title,
      description,
      deliveryAddress: { city: 'Dar es Salaam', region: 'Dar es Salaam' },
    });
    await requestRepo.save(req);
    return req;
  };

  const makeQuote = (
    requestId: string,
    opts: {
      procurementCostTzs: number;
      logisticsCostTzs: number;
      sellingPriceTzs: number;
      end: 'CONVERTED' | 'PUBLISHED' | 'DRAFT' | 'SUPERSEDED';
      label?: string;
    },
  ): void => {
    const quote = RequestQuote.draft({
      requestId,
      createdByProviderId: 'provider-1',
      label: opts.label ?? 'Recommended',
      items: [{ description: `item ${seq}`, quantity: 1, unitPriceTzs: opts.sellingPriceTzs }],
      procurementCostTzs: opts.procurementCostTzs,
      logisticsCostTzs: opts.logisticsCostTzs,
      sellingPriceTzs: opts.sellingPriceTzs,
      deliveryDate: futureDays(5),
      validUntil: futureDays(7),
    });
    quoteRepo.save(quote);
    if (opts.end === 'DRAFT') return;
    quote.publish();
    if (opts.end === 'SUPERSEDED') {
      quote.supersede();
      return;
    }
    if (opts.end === 'CONVERTED') {
      quote.markConverted();
      quoteRepo.updateStatus(quote.id, 'CONVERTED');
      return;
    }
    quoteRepo.updateStatus(quote.id, 'PUBLISHED');
  };

  beforeEach(() => {
    requestRepo = new FakeRequestRepository();
    quoteRepo = new FakeQuoteRepository();
    analytics = new GetDemandAnalyticsUseCase(requestRepo, quoteRepo);
  });

  it('aggregates fulfillment, acceptance, margin, reasons, and clusters', async () => {
    // Request 1 — CCTV, fulfilled (converted quote).
    const r1 = await makeRequest('CCTV camera', 'CCTV installation for the shop');
    r1.markAssessing();
    r1.markFulfillable();
    r1.markQuotePublished();
    r1.markConverted('order-1', 'quote-1');
    makeQuote(r1.id, { procurementCostTzs: 900000, logisticsCostTzs: 50000, sellingPriceTzs: 1050000, end: 'CONVERTED' });
    // An earlier DRAFT variant that was superseded before publish — never offered.
    makeQuote(r1.id, { procurementCostTzs: 880000, logisticsCostTzs: 50000, sellingPriceTzs: 980000, end: 'SUPERSEDED' });

    // Request 2 — fridge installation, fulfilled.
    const r2 = await makeRequest('Fridge installation', 'Fridge delivery and installation service');
    r2.markAssessing();
    r2.markFulfillable();
    r2.markQuotePublished();
    r2.markConverted('order-2', 'quote-2');
    makeQuote(r2.id, { procurementCostTzs: 100000, logisticsCostTzs: 10000, sellingPriceTzs: 150000, end: 'CONVERTED' });

    // Request 3 — unfulfillable.
    const r3 = await makeRequest('Rare spare part', 'Obscure industrial spare part');
    r3.markAssessing();
    r3.markUnfulfillable('Supplier cannot source part');

    // Request 4 — still in flight with one open PUBLISHED quote.
    const r4 = await makeRequest('Solar panel', 'Solar panel with battery');
    r4.markAssessing();
    r4.markFulfillable();
    makeQuote(r4.id, { procurementCostTzs: 600000, logisticsCostTzs: 40000, sellingPriceTzs: 700000, end: 'PUBLISHED' });

    const result = await analytics.execute();

    expect(result.totalRequests).toBe(4);
    expect(result.fulfilledRequests).toBe(2);
    expect(result.fulfillmentRate).toBeCloseTo(0.5, 6);

    // CONVERTED ×2 (were published) + PUBLISHED ×1 = 3 offered quotes; 2 accepted.
    expect(result.publishedQuotes).toBe(3);
    expect(result.acceptedQuotes).toBe(2);
    expect(result.quoteAcceptanceRate).toBeCloseTo(2 / 3, 6);

    // Margin on the two accepted quotes:
    //   q1: (1050000 − 950000)/1050000 = 9.5238%
    //   q2: (150000 − 110000)/150000   = 26.6667%
    //   average = 18.0952%  — the SUPERSEDED and PUBLISHED quotes are excluded.
    expect(result.averageAcceptedMarginPct).not.toBeNull();
    expect(result.averageAcceptedMarginPct!).toBeCloseTo(18.0952, 2);

    expect(result.topUnfulfillableReasons).toEqual([
      { reason: 'Supplier cannot source part', count: 1 },
    ]);

    const cctv = result.categoryClusters.find((c) => c.category === 'cctv');
    expect(cctv).toBeDefined();
    expect(cctv!.count).toBe(2);
    const installation = result.categoryClusters.find((c) => c.category === 'installation');
    expect(installation).toBeDefined();
    expect(installation!.count).toBe(3);
  });

  it('degrades gracefully on an empty book', async () => {
    const result = await analytics.execute();
    expect(result.totalRequests).toBe(0);
    expect(result.fulfillmentRate).toBe(0);
    expect(result.publishedQuotes).toBe(0);
    expect(result.quoteAcceptanceRate).toBe(0);
    expect(result.averageAcceptedMarginPct).toBeNull();
    expect(result.topUnfulfillableReasons).toEqual([]);
    expect(result.categoryClusters).toEqual([]);
  });
});