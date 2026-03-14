import { SearchableProduct } from '../types/search.types';
import { NGramIndex } from './ngram-index';

describe('NGramIndex', () => {
  const products: SearchableProduct[] = [
    {
      id: 'p1',
      name: 'Samsung Galaxy',
      price: 200,
      brand: 'Samsung',
      tags: ['smartphone']
    },
    {
      id: 'p2',
      name: 'Apple iPhone',
      price: 300,
      brand: 'Apple',
      tags: ['ios']
    }
  ];

  it('builds index and returns fuzzy matches using gram overlap', () => {
    const index = new NGramIndex();
    index.build(products);

    const result = index.fuzzyLookup('samsng', 2);

    expect(result.has('p1')).toBe(true);
    expect(result.has('p2')).toBe(false);
  });

  it('normalizes case and punctuation during lookup', () => {
    const index = new NGramIndex();
    index.build([
      {
        id: 'p3',
        name: 'Canon, EOS!',
        price: 400,
        tags: ['camera']
      }
    ]);

    const result = index.fuzzyLookup('canon eos', 2);

    expect(result).toEqual(new Set(['p3']));
  });

  it('supports short words and empty terms safely', () => {
    const index = new NGramIndex();
    index.build([
      {
        id: 'p4',
        name: 'TV Pro',
        price: 100
      }
    ]);

    expect(index.fuzzyLookup('tv', 1)).toEqual(new Set(['p4']));
    expect(index.fuzzyLookup('')).toEqual(new Set());
  });

  it('adds products incrementally and respects overlap threshold', () => {
    const index = new NGramIndex();
    index.build(products);
    index.addProduct({
      id: 'p5',
      name: 'Samsung Tablet',
      price: 150,
      brand: 'Samsung'
    });

    const strict = index.fuzzyLookup('samsung', 4);

    expect(strict.has('p1')).toBe(true);
    expect(strict.has('p5')).toBe(true);
  });

  it('removes indexed product grams from candidate set', () => {
    const index = new NGramIndex();
    const target: SearchableProduct = {
      id: 'p6',
      name: 'Nokia Lumia',
      price: 90,
      brand: 'Nokia'
    };
    index.build([target]);

    expect(index.fuzzyLookup('nokia', 2)).toEqual(new Set(['p6']));

    index.removeProduct('p6', target);

    expect(index.fuzzyLookup('nokia', 2)).toEqual(new Set());
  });
});

