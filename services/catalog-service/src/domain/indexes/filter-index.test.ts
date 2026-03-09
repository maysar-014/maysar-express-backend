import { FilterIndex } from './filter-index';
import type { SearchQuery, SearchableProduct } from '../types/search.types';

describe('filter-index', () => {
  const products: SearchableProduct[] = [
    {
      id: 'p1',
      name: 'Shoe A',
      price: 90,
      salePrice: 70,
      category: 'shoes',
      brand: 'acme',
      status: 'active',
      stock: 10,
      tags: ['sport', 'new']
    },
    {
      id: 'p2',
      name: 'Shoe B',
      price: 120,
      category: 'shoes',
      brand: 'acme',
      status: 'active',
      stock: 0,
      tags: ['sport']
    },
    {
      id: 'p3',
      name: 'Bag A',
      price: 55,
      salePrice: 40,
      category: 'bags',
      brand: 'lux',
      status: 'archived',
      stock: 3,
      tags: ['new']
    }
  ];

  it('filters by combined category, stock, sale and tags constraints', () => {
    const index = new FilterIndex();
    index.build(products);

    const query: SearchQuery = {
      filters: {
        category: 'shoes',
        inStock: true,
        onSale: true,
        tags: ['sport']
      }
    };
    const result = index.filter(query);

    expect(Array.from(result)).toEqual(['p1']);
  });

  it('returns empty for unmatched filters and for empty query filters', () => {
    const index = new FilterIndex();
    index.build(products);

    expect(index.filter({ filters: { category: 'missing' } })).toEqual(new Set());
    expect(index.filter({})).toEqual(new Set());
  });

  it('supports add/remove product and price/status filters', () => {
    const index = new FilterIndex();
    index.build(products);

    const added: SearchableProduct = {
      id: 'p4',
      name: 'Shoe C',
      price: 130,
      category: 'shoes',
      brand: 'acme',
      status: 'active',
      stock: 5,
      tags: ['sport', 'featured']
    };
    index.addProduct(added);

    const priced = index.filter({
      filters: { minPrice: 100, maxPrice: 140, status: 'active' }
    });
    expect(priced.has('p2')).toBe(true);
    expect(priced.has('p4')).toBe(true);

    index.removeProduct('p4', added);
    const afterRemoval = index.filter({
      filters: { brand: 'acme', tags: ['featured'] }
    });
    expect(afterRemoval.size).toBe(0);
  });
});
