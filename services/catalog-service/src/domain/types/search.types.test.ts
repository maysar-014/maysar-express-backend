import {
  FacetResult,
  SearchFacets,
  SearchQuery,
  SearchResponse,
  SearchResult,
  SearchableProduct
} from './search.types';

describe('search types', () => {
  it('supports typed search product/query/result models', () => {
    const product: SearchableProduct = {
      id: 'p-1',
      name: 'Tea',
      price: 1000,
      tags: ['hot'],
      stock: 10
    };
    const query: SearchQuery = {
      text: 'tea',
      filters: { category: 'drinks', minPrice: 500, maxPrice: 2000, inStock: true },
      sortBy: 'relevance',
      limit: 10,
      offset: 0
    };
    const result: SearchResult = {
      productId: product.id,
      relevanceScore: 0.95,
      matchReasons: ['text', 'category']
    };

    expect(product.name).toBe('Tea');
    expect(query.filters?.inStock).toBe(true);
    expect(result.relevanceScore).toBeCloseTo(0.95, 5);
  });

  it('supports typed facets and response shape', () => {
    const facet: FacetResult = { name: 'category', value: 'drinks', count: 4, selected: true };
    const facets: SearchFacets = {
      categories: { drinks: 4 },
      brands: { acme: 2 },
      priceRanges: [{ min: 0, max: 2000, count: 4 }],
      ratings: [{ rating: 4, count: 2 }]
    };
    const response: SearchResponse = {
      results: [{ productId: 'p-1', relevanceScore: 1, matchReasons: ['exact'] }],
      totalCount: 1,
      facets: {
        categories: [facet],
        brands: [],
        priceRanges: [],
        ratings: [],
        productTypes: []
      },
      query: { text: 'tea' },
      executionTime: 12
    };

    expect(facets.categories.drinks).toBe(4);
    expect(response.totalCount).toBe(1);
    expect(response.facets.categories[0].selected).toBe(true);
  });
});
