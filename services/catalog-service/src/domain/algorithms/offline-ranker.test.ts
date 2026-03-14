import { OfflineRanker } from './offline-ranker';
import { SearchableProduct } from '../types/search.types';

describe('OfflineRanker', () => {
  const products: SearchableProduct[] = [
    { id: 'p1', name: 'A', price: 10 },
    { id: 'p2', name: 'B', price: 20 },
    { id: 'p3', name: 'C', price: 30 }
  ];

  it('computes page rank scores from link graph', () => {
    const ranker = new OfflineRanker();
    const links = new Map<string, string[]>([
      ['p1', ['p2', 'p3']],
      ['p2', ['p1']],
      ['p3', ['p1']]
    ]);

    ranker.computePageRank(products, links, 0.85, 5);

    expect(ranker.getScore('p1')).toBeGreaterThan(0);
    expect(ranker.getScore('p2')).toBeGreaterThan(0);
    expect(ranker.getScore('p3')).toBeGreaterThan(0);
  });

  it('computes popularity scores and defaults to zero for missing metrics', () => {
    const ranker = new OfflineRanker();
    const metrics = new Map<string, { views: number; purchases: number; rating: number }>([
      ['p1', { views: 100, purchases: 20, rating: 5 }]
    ]);

    ranker.computePopularityScores(products, metrics);

    expect(ranker.getScore('p1')).toBeGreaterThan(0);
    expect(ranker.getScore('p2')).toBe(0);
    expect(ranker.getScore('p3')).toBe(0);
  });

  it('supports direct score setters and missing score fallback', () => {
    const ranker = new OfflineRanker();

    expect(ranker.getScore('missing')).toBe(0);
    ranker.setScore('p9', 42);
    expect(ranker.getScore('p9')).toBe(42);
  });
});
