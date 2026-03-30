const initializeMock = jest.fn().mockResolvedValue(undefined);
const indexManagerInstance = { initialize: initializeMock };
const searchEngineInstance = { name: 'search-engine' };

const InvertedIndexMock = jest.fn(() => ({ type: 'inverted' }));
const FilterIndexMock = jest.fn(() => ({ type: 'filter' }));
const NGramIndexMock = jest.fn(() => ({ type: 'ngram' }));
const FacetIndexMock = jest.fn(() => ({ type: 'facet' }));
const OfflineRankerMock = jest.fn(() => ({ type: 'ranker' }));
const IndexManagerMock = jest.fn(() => indexManagerInstance);
const OptimizedProductSearchEngineMock = jest.fn(() => searchEngineInstance);

jest.mock('../domain/indexes', () => ({
  InvertedIndex: InvertedIndexMock,
  FilterIndex: FilterIndexMock,
  NGramIndex: NGramIndexMock,
  FacetIndex: FacetIndexMock,
  IndexManager: IndexManagerMock
}), { virtual: true });

jest.mock('../domain/algorithms', () => ({
  OfflineRanker: OfflineRankerMock
}), { virtual: true });

jest.mock('../domain/engines/optimized-search-engine', () => ({
  OptimizedProductSearchEngine: OptimizedProductSearchEngineMock
}), { virtual: true });

type SearchEngineInitializerClass = typeof import('./search-initializer')['SearchEngineInitializer'];

let SearchEngineInitializer: SearchEngineInitializerClass;

describe('SearchEngineInitializer', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    ({ SearchEngineInitializer } = require('./search-initializer'));
    (SearchEngineInitializer as any).indexManager = undefined;
    (SearchEngineInitializer as any).searchEngine = undefined;
  });

  it('builds indexes and search engine from prisma products', async () => {
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
    expect(initializeMock).toHaveBeenCalledWith([
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
    expect(OptimizedProductSearchEngineMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      indexManager: indexManagerInstance,
      searchEngine: searchEngineInstance
    });
    expect(SearchEngineInitializer.getIndexManager()).toBe(indexManagerInstance);
    expect(SearchEngineInitializer.getSearchEngine()).toBe(searchEngineInstance);
    expect(logSpy).toHaveBeenCalledWith('Initializing optimized search indexes...');
    expect(logSpy).toHaveBeenCalledWith('Search indexes initialized with 2 products');
  });
});
