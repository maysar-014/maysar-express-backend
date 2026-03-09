import { InvertedIndex } from './inverted-index';
import type { SearchableProduct } from '../types/search.types';

describe('inverted-index', () => {
  const products: SearchableProduct[] = [
    {
      id: 'p1',
      name: 'Red Running Shoe',
      description: 'Comfortable shoe for long runs',
      brand: 'Acme',
      category: 'shoes',
      tags: ['running', 'sport'],
      price: 100
    },
    {
      id: 'p2',
      name: 'Blue Casual Shoe',
      description: 'Daily lifestyle comfort',
      brand: 'Acme',
      category: 'shoes',
      tags: ['casual'],
      price: 80
    }
  ];

  it('builds index and scores matching products for normalized terms', () => {
    const index = new InvertedIndex();
    index.build(products);

    const scores = index.lookup(['SHOE', 'running', 'the']);

    expect(scores.has('p1')).toBe(true);
    expect(scores.has('p2')).toBe(true);
    expect((scores.get('p1') ?? 0) > 0).toBe(true);
    expect((scores.get('p2') ?? 0) >= 0).toBe(true);
  });

  it('updates lookup results after adding and removing products', () => {
    const index = new InvertedIndex();
    index.build(products);

    const added: SearchableProduct = {
      id: 'p3',
      name: 'Green Trail Boot',
      description: 'Outdoor trail running support',
      brand: 'TrailCo',
      category: 'boots',
      tags: ['outdoor', 'trail'],
      price: 150
    };

    index.addProduct(added);
    expect(index.lookup(['trail']).has('p3')).toBe(true);

    index.removeProduct('p3');
    expect(index.lookup(['trail']).has('p3')).toBe(false);

    index.removeProduct('missing-id');
    expect(index.lookup(['shoe']).size).toBeGreaterThan(0);
  });
});
