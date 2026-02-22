import { SearchableProduct, SearchQuery, SearchResult, SearchResponse } from '../types/search.types';
import { InvertedIndex } from '../indexes/inverted-index';
import { FilterIndex } from '../indexes/filter-index';
import { NGramIndex } from '../indexes/ngram-index';
import { FacetIndex } from '../indexes/facet-index';
import { OfflineRanker } from '../algorithms/offline-ranker';
import { TopKHeap } from '../algorithms/top-k-heap';

export class OptimizedProductSearchEngine {
  constructor(
    private invertedIndex: InvertedIndex,
    private filterIndex: FilterIndex,
    private ngramIndex: NGramIndex,
    private facetIndex: FacetIndex,
    private offlineRanker: OfflineRanker,
    private productMap: Map<string, SearchableProduct>
  ) {}

  search(query: SearchQuery): SearchResponse {
    const startTime = Date.now();

    const filteredIds = this.filterIndex.filter(query);
    
    let scoredProducts: Map<string, number>;
    
    if (query.text) {
      const terms = this.tokenize(query.text);
      scoredProducts = this.invertedIndex.lookup(terms);

      if (scoredProducts.size === 0) {
        const fuzzyIds = this.ngramIndex.fuzzyLookup(query.text, 2);
        scoredProducts = new Map();
        fuzzyIds.forEach(id => scoredProducts.set(id, 0.5));
      }

      const intersection = new Map<string, number>();
      for (const [id, score] of scoredProducts) {
        if (filteredIds.size === 0 || filteredIds.has(id)) {
          intersection.set(id, score);
        }
      }
      scoredProducts = intersection;
    } else {
      scoredProducts = new Map();
      filteredIds.forEach(id => scoredProducts.set(id, 1.0));
    }

    const limit = query.limit || 50;
    const heap = new TopKHeap<SearchResult>(limit);

    for (const [productId, textScore] of scoredProducts) {
      const product = this.productMap.get(productId);
      if (!product) continue;

      const popularityBoost = this.offlineRanker.getScore(productId);
      const finalScore = textScore + popularityBoost * 0.3;

      heap.push({
        productId,
        relevanceScore: finalScore,
        matchReasons: query.text ? [`Matched query: ${query.text}`] : ['Filtered result']
      }, finalScore);
    }

    const topResults = heap.drain();
    const offset = query.offset || 0;
    const paginatedResults = topResults.slice(offset, offset + limit);

    const facets = this.facetIndex.getFacets(filteredIds.size > 0 ? filteredIds : new Set(scoredProducts.keys()));

    const executionTime = Date.now() - startTime;

    return {
      results: paginatedResults,
      totalCount: topResults.length,
      facets: {
        categories: Object.entries(facets.categories).map(([value, count]) => ({
          name: 'category',
          value,
          count,
          selected: query.filters?.category === value
        })),
        brands: Object.entries(facets.brands).map(([value, count]) => ({
          name: 'brand',
          value,
          count,
          selected: query.filters?.brand === value
        })),
        priceRanges: facets.priceRanges.map(range => ({
          name: 'price_range',
          value: `$${range.min}-$${range.max === Infinity ? '+' : range.max}`,
          count: range.count,
          selected: false
        })),
        ratings: facets.ratings.map(r => ({
          name: 'rating',
          value: `${r.rating}+ stars`,
          count: r.count,
          selected: false
        })),
        productTypes: []
      },
      query,
      executionTime
    };
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2);
  }
}
