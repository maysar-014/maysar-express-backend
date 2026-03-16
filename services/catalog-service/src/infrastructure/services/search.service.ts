/**
 * Search Service (Meilisearch)
 * Infrastructure implementation of SearchService using Meilisearch-backed provider
 */

import { SearchService } from '../../domain/interfaces';
import {
  ElasticsearchProvider,
  SearchQuery,
  SearchQueryBuilder,
  SearchResult
} from '../providers/search.provider';

export interface MeilisearchSearchServiceOptions {
  indexName: string;
  fallback?: SearchService;
}

export class MeilisearchSearchService implements SearchService {
  private readonly indexName: string;
  private readonly fallback?: SearchService;

  constructor(
    private readonly provider: ElasticsearchProvider,
    options: MeilisearchSearchServiceOptions
  ) {
    this.indexName = options.indexName;
    this.fallback = options.fallback;
  }

  async index(document: any): Promise<void> {
    if (!document?.id) {
      throw new Error('Search index document must include an id');
    }

    await this.provider.index({
      id: String(document.id),
      index: this.indexName,
      data: document
    });
  }

  async search(query: string, filters: any = {}, pagination: any = {}): Promise<any> {
    try {
      const searchQuery = this.buildSearchQuery(query, filters, pagination);
      const response = await this.provider.search(searchQuery);
      const results = this.mapResults(response);
      return this.applyPostFilters(results, filters);
    } catch (error) {
      if (this.fallback) {
        return this.fallback.search(query, filters, pagination);
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    if (!id) return;
    await this.provider.delete(this.indexName, id);
  }

  async update(id: string, updates: any): Promise<void> {
    if (!id) return;
    await this.provider.update(this.indexName, id, updates);
  }

  private buildSearchQuery(query: string, filters: any, pagination: any): SearchQuery {
    const builder = SearchQueryBuilder.create().index(this.indexName);

    const normalizedQuery = (query || '').trim();
    if (normalizedQuery) {
      builder.match('searchableText', normalizedQuery);
    }

    if (filters?.category) builder.term('categoryId', filters.category);
    if (filters?.seller) builder.term('sellerId', filters.seller);
    if (filters?.productType) builder.term('type', filters.productType);
    if (filters?.status) builder.term('status', filters.status);
    if (filters?.inStock !== undefined) builder.term('inStock', filters.inStock);

    if (filters?.tags && Array.isArray(filters.tags)) {
      for (const tag of filters.tags) {
        builder.term('tags', tag);
      }
    }

    if (filters?.priceRange) {
      builder.range('price', {
        gte: filters.priceRange.min,
        lte: filters.priceRange.max
      });
    }

    const built = builder.build();
    built.from = pagination?.offset ?? 0;
    built.size = pagination?.limit ?? 20;
    built._source = [
      'id',
      'name',
      'title',
      'description',
      'price',
      'currency',
      'categoryId',
      'sellerId',
      'type',
      'tags',
      'status',
      'createdAt',
      'updatedAt',
      'popularityScore',
      'averageRating',
      'rating',
      'inStock'
    ];

    return built;
  }

  private mapResults(response: SearchResult): any[] {
    return response.hits.map(hit => {
      const source: any = hit._source || {};
      const priceValue =
        typeof source.price === 'number'
          ? source.price
          : source.price?.amount ?? 0;

      const currency =
        source.currency ||
        source.price?.currency ||
        'USD';

      return {
        id: source.id || hit._id,
        name: source.name || source.title || '',
        description: source.description || '',
        price: {
          amount: priceValue,
          currency
        },
        categoryId: source.categoryId,
        sellerId: source.sellerId,
        type: source.type || 'physical',
        tags: source.tags || [],
        status: source.status || 'published',
        score: hit._score ?? 0,
        relevanceScore: hit._score ?? 0,
        popularityScore: source.popularityScore ?? 0,
        averageRating: source.averageRating ?? source.rating ?? 0,
        inStock: source.inStock ?? undefined,
        createdAt: source.createdAt ? new Date(source.createdAt) : new Date()
      };
    });
  }

  private applyPostFilters(results: any[], filters: any): any[] {
    let filtered = results;

    if (filters?.excludeProduct) {
      filtered = filtered.filter(product => product.id !== filters.excludeProduct);
    }

    if (filters?.tags && Array.isArray(filters.tags) && filters.tags.length > 0) {
      filtered = filtered.filter(product =>
        filters.tags.every((tag: string) => product.tags?.includes(tag))
      );
    }

    if (filters?.priceRange) {
      filtered = filtered.filter(product => {
        const amount = product.price?.amount ?? 0;
        return amount >= filters.priceRange.min && amount <= filters.priceRange.max;
      });
    }

    if (filters?.inStock !== undefined) {
      filtered = filtered.filter(product => product.inStock === filters.inStock);
    }

    return filtered;
  }
}
