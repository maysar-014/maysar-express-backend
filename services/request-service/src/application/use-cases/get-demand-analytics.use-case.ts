import { RequestRepository } from '../../domain/repositories/request.repository';
import { RequestQuoteRepository } from '../../domain/repositories/request-quote.repository';

/**
 * Demand analytics (backlog §5.3).
 *
 * Aggregates the Request book into the marketplace-growth signals:
 *  - fulfillment rate          : fulfilled / total requests
 *  - quote acceptance rate     : accepted quotes / published quotes
 *  - average margin on accepted quotes
 *  - top unfulfillable reasons (from UNFULFILLABLE assessments)
 *  - category clusters         : demand signal derived from the most frequent
 *                                significant words across request titles +
 *                                descriptions (a request carries no taxonomy
 *                                field, so clusters are content-derived)
 */
export interface DemandAnalyticsResult {
  totalRequests: number;
  fulfilledRequests: number;
  fulfillmentRate: number;
  publishedQuotes: number;
  acceptedQuotes: number;
  quoteAcceptanceRate: number;
  averageAcceptedMarginPct: number | null;
  topUnfulfillableReasons: Array<{ reason: string; count: number }>;
  categoryClusters: Array<{ category: string; count: number }>;
}

export class GetDemandAnalyticsUseCase {
  constructor(
    private readonly requestRepo: RequestRepository,
    private readonly quoteRepo: RequestQuoteRepository,
  ) {}

  async execute(): Promise<DemandAnalyticsResult> {
    const [requests, quotes] = await Promise.all([
      this.requestRepo.listAll(),
      this.quoteRepo.listAll(),
    ]);

    const totalRequests = requests.length;
    const fulfilledRequests = requests.filter((r) => r.status === 'CONVERTED').length;
    const fulfillmentRate = totalRequests > 0 ? fulfilledRequests / totalRequests : 0;

    // "Published" for acceptance purposes = any non-DRAFT offer (PUBLISHED or
    // CONVERTED). Superseded quotes are excluded — they were never offered.
    const publishedQuotes = quotes.filter((q) => q.status === 'PUBLISHED' || q.status === 'CONVERTED').length;
    const acceptedQuotes = quotes.filter((q) => q.status === 'CONVERTED').length;
    const quoteAcceptanceRate = publishedQuotes > 0 ? acceptedQuotes / publishedQuotes : 0;

    // Gross margin on accepted quotes: (selling − procurement − logistics) / selling.
    const margins = quotes
      .filter((q) => q.status === 'CONVERTED' && q.sellingPriceTzs > 0)
      .map((q) => (q.sellingPriceTzs - q.procurementCostTzs - q.logisticsCostTzs) / q.sellingPriceTzs);
    const averageAcceptedMarginPct =
      margins.length > 0
        ? (margins.reduce((sum, m) => sum + m, 0) / margins.length) * 100
        : null;

    const topUnfulfillableReasons = this.topReasons(requests);
    const categoryClusters = this.categoryClusters(requests);

    return {
      totalRequests,
      fulfilledRequests,
      fulfillmentRate,
      publishedQuotes,
      acceptedQuotes,
      quoteAcceptanceRate,
      averageAcceptedMarginPct,
      topUnfulfillableReasons,
      categoryClusters,
    };
  }

  private topReasons(
    requests: Awaited<ReturnType<RequestRepository['listAll']>>,
  ): Array<{ reason: string; count: number }> {
    const counts = new Map<string, number>();
    for (const r of requests) {
      if (r.status === 'UNFULFILLABLE' && r.unfulfillableReason) {
        const key = r.unfulfillableReason.trim();
        if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private categoryClusters(
    requests: Awaited<ReturnType<RequestRepository['listAll']>>,
  ): Array<{ category: string; count: number }> {
    const counts = new Map<string, number>();
    for (const r of requests) {
      for (const word of `${r.title} ${r.description}`.toLowerCase().split(/[^a-z0-9]+/)) {
        if (word.length > 3) counts.set(word, (counts.get(word) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }
}
