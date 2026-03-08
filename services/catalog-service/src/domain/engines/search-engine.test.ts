import {
  FacetStrategy,
  FilterStrategy,
  ProductSearchEngine,
  SearchQuery,
  SearchResponse,
  SearchableProduct,
  SortStrategy,
  TextSearchStrategy
} from './search-engine';
import { ProductStatus, ProductType, ProductVisibility } from '../value-objects/product-types.value-object';

function makeProduct(id: string, overrides: Partial<SearchableProduct> = {}): SearchableProduct {
  const now = new Date('2026-03-08T00:00:00.000Z');
  const productId = {
    toString: () => id
  } as SearchableProduct['productId'];

  const price = {
    toNumber: () => 100
  } as SearchableProduct['price'];

  return {
    productId,
    sellerId: { toString: () => 'seller-1' } as SearchableProduct['sellerId'],
    name: 'Premium Running Shoes',
    description: 'Comfortable shoes for fast delivery and daily training',
    type: ProductType.PHYSICAL,
    status: ProductStatus.PUBLISHED,
    visibility: ProductVisibility.PUBLIC,
    price,
    originalPrice: undefined,
    tags: ['running', 'shoes', 'fitness'],
    category: 'sports',
    subcategory: 'footwear',
    brand: 'MaysarSport',
    sku: 'SKU-1',
    averageRating: 4.5,
    reviewCount: 30,
    inStock: true,
    isOnSale: false,
    popularityScore: 80,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

describe('search-engine', () => {
  it('performs text matching with reasons and highlights', () => {
    const strategy = new TextSearchStrategy();
    const query: SearchQuery = { text: 'running shoes' };
    const products = [
      makeProduct('p1'),
      makeProduct('p2', {
        name: 'Kitchen Mixer',
        description: 'Heavy duty mixer for baking and kitchen prep',
        category: 'home'
      })
    ];

    const results = strategy.search(query, products);

    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some(result => result.productId.toString() === 'p1')).toBe(true);
    expect(results[0].matchReasons.some(reason => reason.includes('running'))).toBe(true);
  });

  it('filters and sorts products using domain constraints', () => {
    const filter = new FilterStrategy();
    const sort = new SortStrategy();

    const visible = makeProduct('a', {
      price: { toNumber: () => 200 } as SearchableProduct['price'],
      isOnSale: true
    });
    const hidden = makeProduct('b', {
      visibility: ProductVisibility.PRIVATE
    });
    const draft = makeProduct('c', {
      status: ProductStatus.DRAFT
    });

    const filtered = filter.applyFilters(
      { category: 'sports', inStockOnly: true, onSaleOnly: true, minPrice: 100 },
      [visible, hidden, draft]
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0].productId.toString()).toBe('a');

    const sorted = sort.sort(
      [
        { productId: visible.productId, relevanceScore: 1, matchReasons: [] },
        { productId: makeProduct('d', { price: { toNumber: () => 50 } as SearchableProduct['price'] }).productId, relevanceScore: 1, matchReasons: [] }
      ],
      { sortBy: 'price_desc' },
      [visible, makeProduct('d', { price: { toNumber: () => 50 } as SearchableProduct['price'] })]
    );
    expect(sorted[0].productId.toString()).toBe('a');
  });

  it('generates facets, search response, suggestions, and performance insights', () => {
    const facet = new FacetStrategy();
    const engine = new ProductSearchEngine();
    const products = [
      makeProduct('p1', { brand: 'BrandA' }),
      makeProduct('p2', {
        brand: 'BrandB',
        category: 'electronics',
        price: { toNumber: () => 20 } as SearchableProduct['price'],
        averageRating: 3.8
      })
    ];

    const facets = facet.generateFacets(products, { category: 'sports' });
    expect(facets.categories.length).toBeGreaterThan(0);
    expect(facets.brands.length).toBe(2);

    const response = engine.search({ text: 'running', limit: 10, offset: 0 }, products);
    expect(response.totalCount).toBeGreaterThanOrEqual(1);
    expect(response.results.length).toBeGreaterThanOrEqual(1);

    const suggestions = engine.suggestQueries('run', ['running shoes', 'runner socks', 'kitchen appliances'], 3);
    expect(suggestions.length).toBeLessThanOrEqual(3);
    expect(suggestions.some(item => item.toLowerCase().includes('run'))).toBe(true);

    const analysis = engine.analyzeSearchPerformance(response);
    expect(analysis.effectiveness).toBeGreaterThanOrEqual(0);
    expect(analysis.diversity).toBeGreaterThanOrEqual(0);
  });

  it('analyzes poor search responses with recommendations', () => {
    const engine = new ProductSearchEngine();
    const poorResponse: SearchResponse = {
      results: [],
      totalCount: 0,
      facets: {
        categories: [{ name: 'category', value: 'sports', count: 10, selected: false }],
        brands: [],
        priceRanges: [{ name: 'price_range', value: 'Under $25', count: 0, selected: false }],
        ratings: [],
        productTypes: []
      },
      query: {},
      executionTime: 150
    };

    const analysis = engine.analyzeSearchPerformance(poorResponse);
    expect(analysis.recommendations.length).toBeGreaterThan(0);
  });
});
