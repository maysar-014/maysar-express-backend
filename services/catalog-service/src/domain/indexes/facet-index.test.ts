import { FacetIndex } from './facet-index';
import type { SearchableProduct } from '../types/search.types';

describe('facet-index', () => {
  const products: SearchableProduct[] = [
    {
      id: 'p1',
      name: 'Basic Shoe',
      price: 40,
      category: 'shoes',
      brand: 'acme',
      rating: 4.2,
      type: 'physical'
    },
    {
      id: 'p2',
      name: 'Premium Shoe',
      price: 75,
      category: 'shoes',
      brand: 'acme',
      rating: 3.8,
      type: 'physical'
    },
    {
      id: 'p3',
      name: 'VIP Bag',
      price: 220,
      category: 'bags',
      brand: 'lux',
      rating: 5,
      type: 'physical'
    }
  ];

  it('builds facet counts from filtered ids', () => {
    const index = new FacetIndex();
    index.build(products);

    const facets = index.getFacets(new Set(['p1', 'p2', 'p3', 'missing']));

    expect(facets.categories).toEqual({ shoes: 2, bags: 1 });
    expect(facets.brands).toEqual({ acme: 2, lux: 1 });
    expect(facets.priceRanges).toEqual([
      { min: 0, max: 50, count: 1 },
      { min: 50, max: 100, count: 1 },
      { min: 100, max: 200, count: 0 },
      { min: 200, max: 500, count: 1 },
      { min: 500, max: Infinity, count: 0 }
    ]);
    expect(facets.ratings).toEqual([
      { rating: 1, count: 0 },
      { rating: 2, count: 0 },
      { rating: 3, count: 1 },
      { rating: 4, count: 1 },
      { rating: 5, count: 1 }
    ]);
  });

  it('updates counts when a product changes category/brand/price/rating', () => {
    const index = new FacetIndex();
    index.build(products);

    const oldProduct = products[0];
    const newProduct: SearchableProduct = {
      ...oldProduct,
      category: 'accessories',
      brand: 'new-brand',
      price: 15,
      rating: 2.2,
      type: 'digital'
    };

    index.updateProduct(oldProduct, newProduct);

    const facets = index.getFacets(new Set(['p1', 'p2', 'p3']));
    expect(facets.categories).toEqual({ accessories: 1, shoes: 1, bags: 1 });
    expect(facets.brands).toEqual({ 'new-brand': 1, acme: 1, lux: 1 });
    expect(facets.priceRanges[0]).toEqual({ min: 0, max: 50, count: 1 });
    expect(facets.ratings.find(entry => entry.rating === 2)?.count).toBe(1);
  });
});
