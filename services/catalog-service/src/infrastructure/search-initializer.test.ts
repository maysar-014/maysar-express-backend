import { IndexManager } from '../domain/indexes';
import { SearchEngineInitializer } from './search-initializer';

describe('SearchEngineInitializer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (SearchEngineInitializer as any).indexManager = undefined;
    (SearchEngineInitializer as any).searchEngine = undefined;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('builds indexes and search engine from prisma products', async () => {
    const initializeSpy = jest
      .spyOn(IndexManager.prototype, 'initialize')
      .mockResolvedValue(undefined);

    const prisma = {
      product: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'p1',
            name: 'Product 1',
            description: 'desc',
            brand: 'Brand',
            tags: ['a'],
            status: 'ACTIVE',
            type: 'PHYSICAL',
            variants: [{ price: 100, compareAtPrice: 120, stock: 2 }],
            category: { name: 'Cat' }
          },
          {
            id: 'p2',
            name: 'Product 2',
            description: null,
            brand: null,
            tags: null,
            status: 'ACTIVE',
            type: 'PHYSICAL',
            variants: [],
            category: null
          }
        ])
      }
    };

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    const result = await SearchEngineInitializer.initialize(prisma as never);

    expect(prisma.product.findMany).toHaveBeenCalledWith({
      include: { variants: true, category: true }
    });
    expect(initializeSpy).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'p1',
        price: 100,
        salePrice: 120,
        category: 'Cat',
        stock: 2
      }),
      expect.objectContaining({
        id: 'p2',
        description: '',
        price: 0,
        tags: []
      })
    ]);
    expect(result.indexManager).toBe(SearchEngineInitializer.getIndexManager());
    expect(result.searchEngine).toBe(SearchEngineInitializer.getSearchEngine());
    expect(result.indexManager).toBeInstanceOf(IndexManager);
    expect(typeof result.searchEngine.search).toBe('function');
    expect(logSpy).toHaveBeenCalledWith('Initializing optimized search indexes...');
    expect(logSpy).toHaveBeenCalledWith('Search indexes initialized with 2 products');
  });
});
