import { SearchEngineInitializer } from '../src/infrastructure/search-initializer';
import { PrismaClient } from '@prisma/client';

describe('Optimized Search Engine Integration', () => {
  let prisma: PrismaClient;
  let searchEngine: any;

  beforeAll(async () => {
    prisma = new PrismaClient();
    const { searchEngine: engine } = await SearchEngineInitializer.initialize(prisma);
    searchEngine = engine;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should perform text search', () => {
    const results = searchEngine.search({
      text: 'test',
      limit: 10
    });

    expect(results).toHaveProperty('results');
    expect(results).toHaveProperty('totalCount');
    expect(results).toHaveProperty('facets');
    expect(results).toHaveProperty('executionTime');
  });

  it('should perform filtered search', () => {
    const results = searchEngine.search({
      filters: {
        minPrice: 10,
        maxPrice: 100
      },
      limit: 10
    });

    expect(results.results).toBeInstanceOf(Array);
  });

  it('should complete search in under 100ms', () => {
    const start = Date.now();
    searchEngine.search({ text: 'product', limit: 50 });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(100);
  });
});
