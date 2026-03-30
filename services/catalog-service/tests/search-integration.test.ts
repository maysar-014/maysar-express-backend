import { SearchEngineInitializer } from '../src/infrastructure/search-initializer';

type MockPrisma = {
  product: {
    findMany: jest.Mock;
  };
  $disconnect: jest.Mock;
};

describe('Optimized Search Engine Integration', () => {
  let prisma: MockPrisma;
  let searchEngine: Awaited<ReturnType<typeof SearchEngineInitializer.initialize>>['searchEngine'];

  beforeAll(async () => {
    prisma = {
      product: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'product-1',
            name: 'Test Product',
            description: 'Integration test product',
            brand: 'Acme',
            tags: ['test', 'sample'],
            status: 'ACTIVE',
            type: 'PHYSICAL',
            variants: [{ price: 49.99, compareAtPrice: 59.99, stock: 12 }],
            category: { name: 'Category' }
          },
          {
            id: 'product-2',
            name: 'Second Product',
            description: null,
            brand: null,
            tags: null,
            status: 'ACTIVE',
            type: 'PHYSICAL',
            variants: [],
            category: null
          }
        ])
      },
      $disconnect: jest.fn().mockResolvedValue(undefined)
    };

    const { searchEngine: engine } = await SearchEngineInitializer.initialize(prisma as never);
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

    expect(prisma.product.findMany).toHaveBeenCalledWith({
      include: { variants: true, category: true }
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
