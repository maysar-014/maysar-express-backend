import { MeilisearchSearchService } from '../search.service';
import type { SearchService } from '../../../domain/interfaces';
import type { ElasticsearchProvider } from '../../providers/search.provider';

describe('MeilisearchSearchService', () => {
  it('falls back to the secondary search service when Meilisearch search fails', async () => {
    const providerSearch = jest.fn().mockRejectedValue(new Error('Meilisearch unavailable'));
    const provider = {
      index: jest.fn(),
      search: providerSearch,
      update: jest.fn(),
      delete: jest.fn()
    } as unknown as ElasticsearchProvider;

    const fallbackResult = {
      results: [
        {
          id: 'fallback-1',
          name: 'Fallback Laptop',
          description: 'Loaded from the repository fallback'
        }
      ],
      total: 1
    };
    const fallbackSearch = jest.fn().mockResolvedValue(fallbackResult);
    const fallbackService = {
      index: jest.fn(),
      search: fallbackSearch,
      remove: jest.fn(),
      update: jest.fn()
    } as unknown as SearchService;

    const searchService = new MeilisearchSearchService(provider, {
      indexName: 'catalog',
      fallback: fallbackService
    });

    const filters = {
      category: 'electronics',
      tags: ['laptop', 'premium']
    };
    const pagination = {
      offset: 5,
      limit: 10
    };

    const result = await searchService.search('gaming laptop', filters, pagination);

    expect(providerSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'catalog',
        from: 5,
        size: 10,
        _source: expect.arrayContaining(['id', 'name', 'description', 'price'])
      })
    );
    expect(fallbackSearch).toHaveBeenCalledWith('gaming laptop', filters, pagination);
    expect(result).toEqual(fallbackResult);
  });
});
