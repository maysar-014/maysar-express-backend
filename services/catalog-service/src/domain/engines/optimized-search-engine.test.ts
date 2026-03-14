import { OptimizedProductSearchEngine } from './optimized-search-engine';

describe('OptimizedProductSearchEngine', () => {
  const buildEngine = () => {
    const invertedIndex = {
      lookup: jest.fn()
    };
    const filterIndex = {
      filter: jest.fn()
    };
    const ngramIndex = {
      fuzzyLookup: jest.fn()
    };
    const facetIndex = {
      getFacets: jest.fn().mockReturnValue({
        categories: { electronics: 2 },
        brands: { Acme: 2 },
        priceRanges: [{ min: 100, max: 200, count: 2 }],
        ratings: [{ rating: 4, count: 2 }]
      })
    };
    const offlineRanker = {
      getScore: jest.fn().mockReturnValue(0.4)
    };
    const productMap = new Map([
      ['p1', { id: 'p1', name: 'Phone One', price: 120 }],
      ['p2', { id: 'p2', name: 'Phone Two', price: 150 }],
      ['p3', { id: 'p3', name: 'Other Product', price: 70 }]
    ]);

    const engine = new OptimizedProductSearchEngine(
      invertedIndex as never,
      filterIndex as never,
      ngramIndex as never,
      facetIndex as never,
      offlineRanker as never,
      productMap as never
    );

    return { engine, invertedIndex, filterIndex, ngramIndex, facetIndex, offlineRanker };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('searches with text and intersects with filtered ids', () => {
    const { engine, invertedIndex, filterIndex } = buildEngine();
    filterIndex.filter.mockReturnValue(new Set(['p1', 'p2']));
    invertedIndex.lookup.mockReturnValue(
      new Map([
        ['p1', 1.4],
        ['p3', 1.2]
      ])
    );

    const result = engine.search({
      text: 'phone',
      limit: 10,
      offset: 0,
      filters: { category: 'electronics', brand: 'Acme' }
    });

    expect(invertedIndex.lookup).toHaveBeenCalledWith(['phone']);
    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toEqual(
      expect.objectContaining({
        productId: 'p1'
      })
    );
    expect(result.totalCount).toBe(1);
    expect(result.facets.categories[0]).toEqual(
      expect.objectContaining({ value: 'electronics', count: 2, selected: true })
    );
  });

  it('falls back to n-gram lookup when text search yields no direct hits', () => {
    const { engine, invertedIndex, filterIndex, ngramIndex } = buildEngine();
    filterIndex.filter.mockReturnValue(new Set(['p2']));
    invertedIndex.lookup.mockReturnValue(new Map());
    ngramIndex.fuzzyLookup.mockReturnValue(new Set(['p2']));

    const result = engine.search({ text: 'fone', limit: 5 });

    expect(ngramIndex.fuzzyLookup).toHaveBeenCalledWith('fone', 2);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].productId).toBe('p2');
    expect(result.results[0].matchReasons).toEqual(['Matched query: fone']);
  });

  it('returns filtered results when query text is absent', () => {
    const { engine, filterIndex } = buildEngine();
    filterIndex.filter.mockReturnValue(new Set(['p1', 'p2']));

    const result = engine.search({ filters: { category: 'electronics' }, limit: 1, offset: 0 });

    expect(result.totalCount).toBe(1);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].matchReasons).toEqual(['Filtered result']);
    expect(result.executionTime).toBeGreaterThanOrEqual(0);
  });
});
