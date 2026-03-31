import { randomUUID } from 'crypto';
import { MeilisearchSearchService } from '../src/infrastructure/services/search.service';
import { SearchProvider, SearchProviderFactory } from '../src/infrastructure/providers/search.provider';

const runMeilisearchIntegration = process.env.RUN_MEILISEARCH_INTEGRATION === 'true';
const describeIfMeilisearch = runMeilisearchIntegration ? describe : describe.skip;

describeIfMeilisearch('MeilisearchSearchService integration', () => {
  jest.setTimeout(60000);

  const host = process.env.MEILISEARCH_HOST || 'localhost';
  const port = Number(process.env.MEILISEARCH_PORT || 7701);
  const apiKey = process.env.MEILISEARCH_API_KEY || process.env.MEILI_MASTER_KEY || 'dev-master-key';
  const indexName = `catalog-search-${randomUUID()}`;

  let provider: ReturnType<typeof SearchProviderFactory.createMeilisearch>;
  let searchService: MeilisearchSearchService;

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const waitForResults = async (
    query: string,
    filters: Record<string, unknown>,
    pagination: Record<string, unknown>
  ): Promise<any[]> => {
    const timeoutMs = 10000;
    const deadline = Date.now() + timeoutMs;
    let lastError: unknown;

    while (Date.now() < deadline) {
      try {
        const results = await searchService.search(query, filters, pagination);
        if (results.length > 0) {
          return results;
        }
      } catch (error) {
        lastError = error;
      }

      await delay(250);
    }

    if (lastError instanceof Error) {
      throw new Error(`Meilisearch search never became ready: ${lastError.message}`);
    }

    throw new Error('Meilisearch search never returned results within the timeout window');
  };

  beforeAll(() => {
    provider = SearchProviderFactory.createMeilisearch({
      provider: SearchProvider.MEILISEARCH,
      fallbackToMemory: false,
      meilisearch: {
        host,
        port,
        protocol: 'http',
        apiKey,
        indexName,
        requestTimeout: 10000
      }
    });

    searchService = new MeilisearchSearchService(provider, { indexName });
  });

  afterAll(async () => {
    await provider.deleteIndex(indexName).catch(() => undefined);
    await provider.close().catch(() => undefined);
  });

  it('indexes and searches catalog products through Meilisearch', async () => {
    await searchService.index({
      id: 'product-1',
      name: 'Gaming Laptop',
      description: 'High-performance laptop for gaming',
      searchableText: 'Gaming Laptop High-performance laptop for gaming',
      price: 1299.99,
      currency: 'USD',
      categoryId: 'electronics',
      sellerId: 'seller-1',
      type: 'physical',
      tags: ['gaming', 'laptop'],
      status: 'published',
      createdAt: new Date('2026-03-31T00:00:00.000Z')
    });

    await searchService.index({
      id: 'product-2',
      name: 'Office Desk',
      description: 'Standing desk',
      searchableText: 'Office Desk Standing desk',
      price: 399.99,
      currency: 'USD',
      categoryId: 'furniture',
      sellerId: 'seller-2',
      type: 'physical',
      tags: ['office'],
      status: 'published',
      createdAt: new Date('2026-03-31T00:00:00.000Z')
    });

    const results = await waitForResults(
      'gaming laptop',
      {
        category: 'electronics',
        priceRange: { min: 1000, max: 1500 }
      },
      {
        limit: 10,
        offset: 0
      }
    );

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual(
      expect.objectContaining({
        id: 'product-1',
        name: 'Gaming Laptop',
        categoryId: 'electronics'
      })
    );
  });
});
