/**
 * Search Mapper Test Suite
 * Tests for search data mapping between different layers
 */

import { SearchMapper } from '../search-mapper';
import {
  ProductSearchRequestDto,
  AdvancedSearchRequestDto,
  SearchTemplateDto,
  SearchConfigurationDto,
  SearchValidationRequestDto,
} from '../../dto/search-dto';

describe('SearchMapper', () => {
  describe('searchRequestToDomain', () => {
    it('should map ProductSearchRequestDto to domain search query', () => {
      const dto: ProductSearchRequestDto = {
        query: 'smartphone',
        filters: {
          category: 'electronics',
          priceRange: {
            min: 100,
            max: 1000
          },
          inStock: true,
          rating: {
            min: 4
          }
        },
        sorting: {
          field: 'relevance',
          direction: 'desc'
        },
        pagination: {
          page: 1,
          limit: 20
        },
        searchOptions: {
          strategy: 'hybrid',
          scope: 'products',
          includeFacets: true,
          includeSuggestions: true,
          fuzzyThreshold: 0.8
        },
        context: {
          userId: 'user-123',
          userPreferences: {
            preferredCategories: ['electronics', 'mobile'],
            priceSensitivity: 'medium'
          }
        }
      };

      const domainQuery = SearchMapper.searchRequestToDomain(dto) as {
        query?: string;
        filters: Record<string, unknown>;
        sorting: Record<string, unknown>;
        pagination: typeof dto.pagination;
        searchOptions: typeof dto.searchOptions;
        context?: typeof dto.context;
      };

      expect(domainQuery.query).toBe('smartphone');
      expect(domainQuery.filters).toEqual(dto.filters);
      expect(domainQuery.sorting).toEqual(dto.sorting);
      expect(domainQuery.pagination).toEqual(dto.pagination);
      expect(domainQuery.searchOptions).toEqual(dto.searchOptions);
      expect(domainQuery.context).toEqual(dto.context);
    });

    it('should handle minimal ProductSearchRequestDto', () => {
      const dto: ProductSearchRequestDto = {
        filters: {},
        sorting: {
          field: 'relevance',
          direction: 'desc'
        },
        pagination: {
          page: 1,
          limit: 10
        },
        searchOptions: {
          strategy: 'exact',
          scope: 'products'
        }
      };

      const domainQuery = SearchMapper.searchRequestToDomain(dto) as {
        query?: string;
        filters: Record<string, unknown>;
        sorting: Record<string, unknown>;
        pagination: typeof dto.pagination;
        searchOptions: typeof dto.searchOptions;
        context?: typeof dto.context;
      };

      expect(domainQuery.query).toBeUndefined();
      expect(domainQuery.filters).toEqual({});
      expect(domainQuery.sorting).toEqual(dto.sorting);
      expect(domainQuery.pagination).toEqual(dto.pagination);
      expect(domainQuery.searchOptions).toEqual(dto.searchOptions);
      expect(domainQuery.context).toBeUndefined();
    });

    it('should handle location-based search', () => {
      const dto: ProductSearchRequestDto = {
        query: 'restaurants',
        filters: {
          location: {
            latitude: 40.7128,
            longitude: -74.006,
            radius: 5
          }
        },
        sorting: {
          field: 'distance',
          direction: 'asc'
        },
        pagination: {
          page: 1,
          limit: 10
        },
        searchOptions: {
          strategy: 'semantic',
          scope: 'all'
        }
      };

      const domainQuery = SearchMapper.searchRequestToDomain(dto) as {
        query?: string;
        filters: Record<string, unknown>;
        sorting: Record<string, unknown>;
        pagination: typeof dto.pagination;
        searchOptions: typeof dto.searchOptions;
        context?: typeof dto.context;
      };

      expect(domainQuery.filters.location).toEqual({
        latitude: 40.7128,
        longitude: -74.006,
        radius: 5
      });
      expect(domainQuery.sorting.field).toBe('distance');
    });
  });

  describe('searchResultsToDto', () => {
    it('should map domain search results to ProductSearchResponseDto', () => {
      const domainResults = {
        results: [
          {
            productId: 'product-1',
            name: 'Smartphone Pro',
            description: 'Latest smartphone',
            price: { amount: 999, currency: 'USD' },
            category: { id: 'cat-1', name: 'Electronics' },
            seller: { id: 'seller-1', name: 'Tech Store' },
            type: 'PHYSICAL',
            tags: ['smartphone', 'tech'],
            status: 'active',
            relevanceScore: 0.95,
            matchReasons: ['query_match', 'category_match'],
            highlights: { name: ['<em>Smartphone</em> Pro'] },
            media: [{ url: 'image.jpg', type: 'image', isPrimary: true }],
            inventory: { available: 50, status: 'in_stock' },
            rating: { average: 4.5, count: 100 },
            analytics: { viewCount: 1000, purchaseCount: 50 },
            distance: 2.5,
            personalizedScore: 0.88,
            createdAt: new Date('2023-06-01'),
            updatedAt: new Date('2023-06-15')
          }
        ],
        total: 150,
        facets: [
          {
            field: 'category',
            label: 'Category',
            type: 'value',
            values: [
              { value: 'electronics', label: 'Electronics', count: 100 },
              { value: 'mobile', label: 'Mobile', count: 50 }
            ]
          }
        ],
        suggestions: [
          {
            type: 'query_completion',
            value: 'smartphone cases',
            label: 'Smartphone Cases',
            relevance: 0.8,
            reason: 'related_search'
          }
        ],
        analytics: {
          queryAnalysis: {
            originalQuery: 'smartphone',
            processedQuery: 'smartphone',
            detectedIntent: 'product_search'
          },
          performance: {
            totalResults: 150,
            relevantResults: 120,
            precision: 0.8,
            recall: 0.9,
            f1Score: 0.85,
            averageRelevanceScore: 0.75
          }
        },
        pagination: {
          page: 1,
          limit: 20,
          totalPages: 8,
          hasNext: true,
          hasPrev: false,
          totalResults: 150
        },
        searchMetadata: {
          query: 'smartphone',
          filtersApplied: ['category', 'price_range'],
          executionTime: 45,
          searchEngine: 'elasticsearch',
          strategyUsed: 'hybrid',
          totalDocumentsSearched: 10000
        }
      };

      const dto = SearchMapper.searchResultsToDto(domainResults as unknown as Parameters<typeof SearchMapper.searchResultsToDto>[0]);

      expect(dto.results).toHaveLength(1);
      expect(dto.results[0].productId).toBe('product-1');
      expect(dto.results[0].name).toBe('Smartphone Pro');
      expect(dto.results[0].price.amount).toBe(999);
      expect(dto.results[0].category.id).toBe('cat-1');
      expect(dto.results[0].relevanceScore).toBe(0.95);
      expect(dto.total).toBe(150);
      expect(dto.facets).toHaveLength(1);
      expect(dto.facets![0].field).toBe('category');
      expect(dto.suggestions).toHaveLength(1);
      expect(dto.suggestions![0].type).toBe('query_completion');
      expect(dto.analytics).toBeDefined();
      expect(dto.pagination).toEqual(domainResults.pagination);
      expect(dto.searchMetadata).toEqual(domainResults.searchMetadata);
    });

    it('should handle results without optional fields', () => {
      const domainResults = {
        results: [
          {
            productId: 'product-simple',
            name: 'Simple Product',
            description: 'Simple description',
            price: { amount: 50, currency: 'USD' },
            category: { id: 'cat-simple', name: 'Simple' },
            seller: { id: 'seller-simple', name: 'Simple Store' },
            type: 'PHYSICAL',
            tags: [],
            status: 'active',
            relevanceScore: 0.5,
            matchReasons: [],
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ],
        total: 1,
        pagination: {
          page: 1,
          limit: 10,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
          totalResults: 1
        },
        searchMetadata: {
          query: '',
          filtersApplied: [],
          executionTime: 10,
          searchEngine: 'elasticsearch',
          strategyUsed: 'exact',
          totalDocumentsSearched: 100
        }
      };

      const dto = SearchMapper.searchResultsToDto(domainResults as unknown as Parameters<typeof SearchMapper.searchResultsToDto>[0]);

      expect(dto.results).toHaveLength(1);
      expect(dto.results[0].productId).toBe('product-simple');
      expect(dto.results[0].highlights).toBeUndefined();
      expect(dto.results[0].distance).toBeUndefined();
      expect(dto.facets).toBeUndefined();
      expect(dto.suggestions).toBeUndefined();
      expect(dto.analytics).toBeUndefined();
    });
  });

  describe('searchResultToDto', () => {
    it('should map individual search result to ProductSearchResultDto', () => {
      const domainResult = {
        productId: 'result-123',
        name: 'Test Product',
        description: 'Test description',
        price: { amount: 100, currency: 'USD', originalPrice: 120, discountPercentage: 16.67 },
        category: { id: 'cat-123', name: 'Test Category', path: ['Electronics', 'Mobile'] },
        seller: { id: 'seller-123', name: 'Test Seller', rating: 4.8 },
        type: 'DIGITAL',
        tags: ['test', 'product'],
        status: 'published',
        relevanceScore: 0.9,
        matchReasons: ['exact_match', 'category_boost'],
        highlights: { description: ['<em>Test</em> description'] },
        media: [
          { url: 'image1.jpg', type: 'image', isPrimary: true },
          { url: 'video1.mp4', type: 'video', isPrimary: false }
        ],
        inventory: { available: 25, status: 'in_stock' },
        rating: { average: 4.2, count: 75 },
        analytics: { viewCount: 500, purchaseCount: 25, conversionRate: 0.05 },
        distance: 1.2,
        personalizedScore: 0.85,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-06-15')
      };

      const dto = SearchMapper.searchResultToDto(domainResult as unknown as Parameters<typeof SearchMapper.searchResultToDto>[0]);

      expect(dto.productId).toBe('result-123');
      expect(dto.name).toBe('Test Product');
      expect(dto.description).toBe('Test description');
      expect(dto.price).toEqual({
        amount: 100,
        currency: 'USD',
        originalPrice: 120,
        discountPercentage: 16.67
      });
      expect(dto.category).toEqual({
        id: 'cat-123',
        name: 'Test Category',
        path: ['Electronics', 'Mobile']
      });
      expect(dto.seller).toEqual({
        id: 'seller-123',
        name: 'Test Seller',
        rating: 4.8
      });
      expect(dto.type).toBe('DIGITAL');
      expect(dto.tags).toEqual(['test', 'product']);
      expect(dto.status).toBe('published');
      expect(dto.relevanceScore).toBe(0.9);
      expect(dto.matchReasons).toEqual(['exact_match', 'category_boost']);
      expect(dto.highlights).toEqual({ description: ['<em>Test</em> description'] });
      expect(dto.media).toHaveLength(2);
      expect(dto.inventory).toEqual({ available: 25, status: 'in_stock' });
      expect(dto.rating).toEqual({ average: 4.2, count: 75 });
      expect(dto.analytics).toEqual({ viewCount: 500, purchaseCount: 25, conversionRate: 0.05 });
      expect(dto.distance).toBe(1.2);
      expect(dto.personalizedScore).toBe(0.85);
      expect(dto.createdAt).toEqual(new Date('2023-01-01'));
      expect(dto.updatedAt).toEqual(new Date('2023-06-15'));
    });
  });

  describe('facetToDto', () => {
    it('should map search facet to SearchFacetDto', () => {
      const domainFacet = {
        field: 'price',
        label: 'Price Range',
        type: 'range',
        values: [],
        ranges: [
          { range: '$0-$50', min: 0, max: 50, count: 100, selected: false },
          { range: '$50-$100', min: 50, max: 100, count: 150, selected: true }
        ],
        metadata: {
          totalValues: 2,
          hasMore: false,
          sortOrder: 'count'
        }
      };

      const dto = SearchMapper.facetToDto(domainFacet);

      expect(dto.field).toBe('price');
      expect(dto.label).toBe('Price Range');
      expect(dto.type).toBe('range');
      expect(dto.values).toEqual([]);
      expect(dto.ranges).toHaveLength(2);
      expect(dto.ranges![0].range).toBe('$0-$50');
      expect(dto.ranges![0].min).toBe(0);
      expect(dto.ranges![0].max).toBe(50);
      expect(dto.ranges![0].count).toBe(100);
      expect(dto.ranges![0].selected).toBe(false);
      expect(dto.metadata).toEqual({
        totalValues: 2,
        hasMore: false,
        sortOrder: 'count'
      });
    });
  });

  describe('suggestionToDto', () => {
    it('should map search suggestion to SearchSuggestionDto', () => {
      const domainSuggestion = {
        type: 'query_correction',
        value: 'smartphone',
        label: 'Did you mean: smartphone?',
        relevance: 0.95,
        reason: 'spelling_correction',
        metadata: {
          popularity: 1000,
          confidence: 0.9
        }
      };

      const dto = SearchMapper.suggestionToDto(domainSuggestion);

      expect(dto.type).toBe('query_correction');
      expect(dto.value).toBe('smartphone');
      expect(dto.label).toBe('Did you mean: smartphone?');
      expect(dto.relevance).toBe(0.95);
      expect(dto.reason).toBe('spelling_correction');
      expect(dto.metadata).toEqual({
        popularity: 1000,
        confidence: 0.9
      });
    });
  });

  describe('analyticsToDto', () => {
    it('should map search analytics to SearchAnalyticsDto', () => {
      const domainAnalytics = {
        queryAnalysis: {
          originalQuery: 'smart phone',
          processedQuery: 'smartphone',
          detectedIntent: 'product_search',
          entities: [
            { type: 'product', value: 'smartphone', confidence: 0.9 }
          ],
          sentiment: 'neutral'
        },
        performance: {
          totalResults: 1000,
          relevantResults: 800,
          precision: 0.8,
          recall: 0.9,
          f1Score: 0.85,
          averageRelevanceScore: 0.75
        },
        userBehavior: {
          clickThroughRate: 0.15,
          conversionRate: 0.05,
          averageDwellTime: 120,
          bounceRate: 0.25
        },
        searchPatterns: {
          commonTerms: [
            { term: 'smartphone', frequency: 500, trend: 'increasing' },
            { term: 'phone', frequency: 300, trend: 'stable' }
          ],
          popularCategories: [
            { category: 'electronics', searchCount: 1000, conversionRate: 0.08 },
            { category: 'mobile', searchCount: 800, conversionRate: 0.12 }
          ],
          priceSensitivity: {
            averageMinPrice: 50,
            averageMaxPrice: 500,
            priceRangeUsage: 0.6
          }
        }
      };

      const dto = SearchMapper.analyticsToDto(domainAnalytics);

      expect(dto.queryAnalysis.originalQuery).toBe('smart phone');
      expect(dto.queryAnalysis.processedQuery).toBe('smartphone');
      expect(dto.queryAnalysis.detectedIntent).toBe('product_search');
      expect(dto.queryAnalysis.entities).toHaveLength(1);
      expect(dto.queryAnalysis.entities![0].type).toBe('product');
      expect(dto.queryAnalysis.sentiment).toBe('neutral');
      expect(dto.performance.totalResults).toBe(1000);
      expect(dto.performance.precision).toBe(0.8);
      expect(dto.userBehavior.clickThroughRate).toBe(0.15);
      expect(dto.searchPatterns.commonTerms).toHaveLength(2);
      expect(dto.searchPatterns.popularCategories).toHaveLength(2);
      expect(dto.searchPatterns.priceSensitivity.averageMinPrice).toBe(50);
    });
  });

  describe('advancedSearchRequestToDomain', () => {
    it('should map AdvancedSearchRequestDto to domain', () => {
      const dto: AdvancedSearchRequestDto = {
        query: 'laptop gaming',
        filters: {
          category: 'electronics',
          priceRange: { min: 1000, max: 3000 }
        },
        sorting: {
          field: 'relevance',
          direction: 'desc'
        },
        pagination: {
          page: 1,
          limit: 20
        },
        searchOptions: {
          strategy: 'hybrid',
          scope: 'products',
          includeFacets: true
        },
        queryOptions: {
          booleanOperators: true,
          fieldBoosting: { name: 2.0, description: 1.5 },
          minimumShouldMatch: '75%',
          explain: true
        },
        resultOptions: {
          fields: ['name', 'description', 'price'],
          aggregations: [
            {
              name: 'price_ranges',
              type: 'range',
              field: 'price.amount',
              options: {
                ranges: [
                  { from: 0, to: 1000 },
                  { from: 1000, to: 2000 },
                  { from: 2000, to: 5000 }
                ]
              }
            }
          ],
          highlighting: {
            fields: ['name', 'description'],
            preTag: '<em>',
            postTag: '</em>',
            fragmentSize: 100,
            numberOfFragments: 3
          }
        },
        personalization: {
          enablePersonalization: true,
          userProfile: {
            preferences: { categories: ['electronics', 'gaming'] },
            behaviorHistory: [
              {
                action: 'view',
                productId: 'laptop-1',
                timestamp: new Date('2023-06-01'),
                weight: 1.0
              }
            ]
          },
          contextSignals: {
            timeOfDay: 14,
            dayOfWeek: 3,
            season: 'summer',
            deviceType: 'desktop'
          }
        }
      };

      const domainRequest = SearchMapper.advancedSearchRequestToDomain(dto);

      expect(domainRequest.query).toBe('laptop gaming');
      expect(domainRequest.filters).toEqual(dto.filters);
      expect(domainRequest.queryOptions).toEqual(dto.queryOptions);
      expect(domainRequest.resultOptions).toEqual(dto.resultOptions);
      expect(domainRequest.personalization).toEqual(dto.personalization);
    });
  });

  describe('searchTemplateToDomain', () => {
    it('should map SearchTemplateDto to domain', () => {
      const dto: SearchTemplateDto = {
        templateId: 'template-123',
        name: 'Electronics Template',
        description: 'Template for electronics searches',
        category: 'business_type',
        baseQuery: {
          filters: { category: 'electronics' },
          sorting: { field: 'relevance', direction: 'desc' },
          pagination: { page: 1, limit: 20 },
          searchOptions: { strategy: 'hybrid', scope: 'products' }
        },
        variables: [
          {
            name: 'minPrice',
            type: 'number',
            required: false,
            defaultValue: 0,
            validation: { min: 0, max: 10000 }
          },
          {
            name: 'maxPrice',
            type: 'number',
            required: false,
            defaultValue: 1000,
            validation: { min: 0, max: 50000 }
          }
        ],
        isActive: true,
        usageCount: 150,
        createdBy: 'admin',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-06-15'),
        tags: ['electronics', 'template']
      };

      const domainTemplate = SearchMapper.searchTemplateToDomain(dto) as {
        templateId: string;
        name: string;
        description?: string;
        operationType: string;
        baseQuery: typeof dto.baseQuery;
        variables: Array<{ name: string; type: string; required: boolean }>;
        isActive: boolean;
        usageCount: number;
        createdBy: string;
        tags?: string[];
      };

      expect(domainTemplate.templateId).toBe('template-123');
      expect(domainTemplate.name).toBe('Electronics Template');
      expect(domainTemplate.description).toBe('Template for electronics searches');
      expect(domainTemplate.operationType).toBe('business_type');
      expect(domainTemplate.baseQuery).toEqual(dto.baseQuery);
      expect(domainTemplate.variables).toHaveLength(2);
      expect(domainTemplate.variables[0].name).toBe('minPrice');
      expect(domainTemplate.isActive).toBe(true);
      expect(domainTemplate.usageCount).toBe(150);
      expect(domainTemplate.createdBy).toBe('admin');
      expect(domainTemplate.tags).toEqual(['electronics', 'template']);
    });
  });

  describe('searchTemplateToDto', () => {
    it('should map domain search template to SearchTemplateDto', () => {
      const domainTemplate = {
        templateId: 'domain-template-123',
        name: 'Domain Template',
        description: 'Domain template description',
        operationType: 'user_segment',
        baseQuery: {
          filters: { category: 'books' },
          sorting: { field: 'rating', direction: 'desc' },
          pagination: { page: 1, limit: 10 },
          searchOptions: { strategy: 'semantic', scope: 'products' }
        },
        variables: [
          {
            name: 'author',
            type: 'string',
            required: true,
            defaultValue: '',
            validation: { pattern: '^[a-zA-Z\\s]+$' }
          }
        ],
        isActive: true,
        usageCount: 50,
        createdBy: 'system',
        createdAt: new Date('2023-03-01'),
        updatedAt: new Date('2023-06-10'),
        tags: ['books', 'literature']
      };

      const dto = SearchMapper.searchTemplateToDto(domainTemplate as unknown as Parameters<typeof SearchMapper.searchTemplateToDto>[0]);

      expect(dto.templateId).toBe('domain-template-123');
      expect(dto.name).toBe('Domain Template');
      expect(dto.description).toBe('Domain template description');
      expect(dto.category).toBe('user_segment');
      expect(dto.baseQuery).toEqual(domainTemplate.baseQuery);
      expect(dto.variables).toHaveLength(1);
      expect(dto.variables[0].name).toBe('author');
      expect(dto.isActive).toBe(true);
      expect(dto.usageCount).toBe(50);
      expect(dto.createdBy).toBe('system');
      expect(dto.tags).toEqual(['books', 'literature']);
    });
  });

  describe('searchConfigurationToDomain', () => {
    it('should map SearchConfigurationDto to domain', () => {
      const dto: SearchConfigurationDto = {
        searchEngine: {
          type: 'elasticsearch',
          version: '8.5.0',
          endpoints: ['http://localhost:9200'],
          authentication: {
            type: 'basic',
            credentials: { username: 'admin', password: 'password' }
          }
        },
        indexSettings: {
          name: 'products_index',
          mappings: { properties: { name: { type: 'text' } } },
          settings: {
            replicas: 1,
            shards: 5,
            refreshInterval: '1s',
            analysis: {
              analyzers: { standard: { type: 'standard' } },
              tokenizers: { keyword: { type: 'keyword' } },
              filters: { lowercase: { type: 'lowercase' } }
            }
          }
        },
        searchSettings: {
          defaultStrategy: 'hybrid',
          fuzzyMatching: {
            enabled: true,
            prefixLength: 1,
            maxExpansions: 50,
            similarity: 0.5
          },
          relevance: {
            boostFactors: { name: 2.0, category: 1.5, rating: 1.2 },
            decayFunctions: [
              {
                field: 'createdAt',
                type: 'gauss',
                scale: '30d',
                decay: 0.5
              }
            ]
          },
          caching: {
            enabled: true,
            ttl: 300,
            maxSize: 1000
          }
        },
        monitoring: {
          metricsEnabled: true,
          slowQueryThreshold: 1000,
          indexStats: true,
          queryProfiling: false
        }
      };

      const domainConfig = SearchMapper.searchConfigurationToDomain(dto) as {
        searchEngine: { type: string; version: string; endpoints: string[] };
        indexSettings: { name: string };
        searchSettings: { defaultStrategy: string; fuzzyMatching: { enabled: boolean } };
        monitoring: { metricsEnabled: boolean };
      };

      expect(domainConfig.searchEngine.type).toBe('elasticsearch');
      expect(domainConfig.searchEngine.version).toBe('8.5.0');
      expect(domainConfig.searchEngine.endpoints).toEqual(['http://localhost:9200']);
      expect(domainConfig.indexSettings.name).toBe('products_index');
      expect(domainConfig.searchSettings.defaultStrategy).toBe('hybrid');
      expect(domainConfig.searchSettings.fuzzyMatching.enabled).toBe(true);
      expect(domainConfig.monitoring.metricsEnabled).toBe(true);
    });
  });

  describe('validationRequestToDomain', () => {
    it('should map SearchValidationRequestDto to domain', () => {
      const dto: SearchValidationRequestDto = {
        query: 'test query',
        filters: {
          category: 'electronics',
          priceRange: { min: 100, max: 500 }
        },
        options: {
          strictValidation: true,
          suggestCorrections: true,
          checkPerformance: true
        }
      };

      const domainRequest = SearchMapper.validationRequestToDomain(dto);

      expect(domainRequest.query).toBe('test query');
      expect(domainRequest.filters).toEqual(dto.filters);
      expect(domainRequest.options).toEqual(dto.options);
    });
  });

  describe('validationResponseToDto', () => {
    it('should map domain validation response to SearchValidationResponseDto', () => {
      const domainResponse = {
        isValid: true,
        errors: [],
        warnings: [
          {
            field: 'query',
            message: 'Query is too short',
            suggestion: 'Add more specific terms'
          }
        ],
        suggestions: [
          {
            type: 'query_improvement',
            message: 'Use more specific keywords',
            field: 'query',
            impact: 'medium'
          }
        ],
        performance: {
          estimatedExecutionTime: 50,
          estimatedResultCount: 1000,
          complexity: 'simple',
          optimizationOpportunities: ['Add filters to improve performance']
        },
        corrections: {
          originalQuery: 'lapt',
          correctedQuery: 'laptop',
          confidence: 0.95,
          alternatives: ['laptop', 'notebook', 'computer']
        }
      };

      const dto = SearchMapper.validationResponseToDto(domainResponse);

      expect(dto.isValid).toBe(true);
      expect(dto.errors).toEqual([]);
      expect(dto.warnings).toHaveLength(1);
      expect(dto.warnings[0].field).toBe('query');
      expect(dto.warnings[0].message).toBe('Query is too short');
      expect(dto.suggestions).toHaveLength(1);
      expect(dto.suggestions[0].type).toBe('query_improvement');
      expect(dto.performance.estimatedExecutionTime).toBe(50);
      expect(dto.performance.complexity).toBe('simple');
      expect(dto.corrections).toBeDefined();
      expect(dto.corrections!.originalQuery).toBe('lapt');
      expect(dto.corrections!.correctedQuery).toBe('laptop');
    });
  });

  describe('batch mapping', () => {
    it('should map multiple search results to DTOs', () => {
      const domainResults = [
        {
          productId: 'result-1',
          name: 'Product 1',
          price: { amount: 100, currency: 'USD' },
          relevanceScore: 0.9,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          productId: 'result-2',
          name: 'Product 2',
          price: { amount: 200, currency: 'USD' },
          relevanceScore: 0.8,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      const dtos = SearchMapper.searchResultsToDtoBatch(domainResults as unknown as Parameters<typeof SearchMapper.searchResultsToDtoBatch>[0]);

      expect(dtos).toHaveLength(2);
      expect(dtos[0].productId).toBe('result-1');
      expect(dtos[0].name).toBe('Product 1');
      expect(dtos[0].price.amount).toBe(100);
      expect(dtos[1].productId).toBe('result-2');
      expect(dtos[1].name).toBe('Product 2');
      expect(dtos[1].price.amount).toBe(200);
    });

    it('should map multiple facets to DTOs', () => {
      const domainFacets = [
        {
          field: 'category',
          label: 'Category',
          type: 'value',
          values: [{ value: 'electronics', label: 'Electronics', count: 100 }]
        },
        {
          field: 'brand',
          label: 'Brand',
          type: 'value',
          values: [{ value: 'brand-a', label: 'Brand A', count: 50 }]
        }
      ];

      const dtos = SearchMapper.facetsToDtoBatch(domainFacets);

      expect(dtos).toHaveLength(2);
      expect(dtos[0].field).toBe('category');
      expect(dtos[0].label).toBe('Category');
      expect(dtos[1].field).toBe('brand');
      expect(dtos[1].label).toBe('Brand');
    });

    it('should map multiple suggestions to DTOs', () => {
      const domainSuggestions = [
        {
          type: 'query_completion',
          value: 'smartphone cases',
          relevance: 0.8,
          reason: 'related_search'
        },
        {
          type: 'popular_search',
          value: 'best laptops',
          relevance: 0.9,
          reason: 'trending'
        }
      ];

      const dtos = SearchMapper.suggestionsToDtoBatch(domainSuggestions);

      expect(dtos).toHaveLength(2);
      expect(dtos[0].type).toBe('query_completion');
      expect(dtos[0].value).toBe('smartphone cases');
      expect(dtos[1].type).toBe('popular_search');
      expect(dtos[1].value).toBe('best laptops');
    });
  });

  describe('validation', () => {
    it('should validate ProductSearchRequestDto', () => {
      const validDto: ProductSearchRequestDto = {
        filters: {},
        sorting: { field: 'relevance', direction: 'desc' },
        pagination: { page: 1, limit: 20 },
        searchOptions: { strategy: 'hybrid', scope: 'products' }
      };

      const invalidDto = {
        filters: {},
        sorting: { field: 'invalid', direction: 'invalid' },
        pagination: { page: 0, limit: 0 },
        searchOptions: {}
      } as unknown as Parameters<typeof SearchMapper.validateSearchRequest>[0];

      expect(SearchMapper.validateSearchRequest(validDto)).toBe(true);
      expect(SearchMapper.validateSearchRequest(invalidDto)).toBe(false);
    });

    it('should validate AdvancedSearchRequestDto', () => {
      const validDto: AdvancedSearchRequestDto = {
        filters: {},
        sorting: { field: 'relevance', direction: 'desc' },
        pagination: { page: 1, limit: 20 },
        searchOptions: { strategy: 'hybrid', scope: 'products' },
        queryOptions: {
          booleanOperators: true,
          fieldBoosting: { name: 2.0 },
          minimumShouldMatch: '75%'
        },
        resultOptions: {
          fields: ['name'],
          aggregations: []
        },
        personalization: {
          enablePersonalization: true,
          userProfile: { preferences: {}, behaviorHistory: [] },
          contextSignals: { timeOfDay: 12, dayOfWeek: 1, season: 'spring' }
        }
      };

      const invalidDto = {
        filters: {},
        sorting: { field: 'relevance', direction: 'desc' },
        pagination: { page: 1, limit: 20 },
        searchOptions: { strategy: 'hybrid', scope: 'products' },
        queryOptions: {},
        resultOptions: {},
        personalization: {}
      } as Parameters<typeof SearchMapper.validateAdvancedSearchRequest>[0];

      expect(SearchMapper.validateAdvancedSearchRequest(validDto)).toBe(true);
      expect(SearchMapper.validateAdvancedSearchRequest(invalidDto)).toBe(false);
    });

    it('should validate SearchTemplateDto', () => {
      const validDto: SearchTemplateDto = {
        templateId: 'template-123',
        name: 'Valid Template',
        category: 'user_segment',
        baseQuery: {
          filters: {},
          sorting: { field: 'relevance', direction: 'desc' },
          pagination: { page: 1, limit: 20 },
          searchOptions: { strategy: 'hybrid', scope: 'products' }
        },
        variables: [],
        isActive: true,
        usageCount: 10,
        createdBy: 'admin',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-06-15')
      };

      const invalidDto = {
        templateId: '',
        name: '',
        category: 'invalid',
        baseQuery: {},
        variables: [],
        isActive: 'not boolean',
        usageCount: 'not number',
        createdBy: '',
        createdAt: 'not date',
        updatedAt: 'not date'
      } as unknown as Parameters<typeof SearchMapper.validateSearchTemplate>[0];

      expect(SearchMapper.validateSearchTemplate(validDto)).toBe(true);
      expect(SearchMapper.validateSearchTemplate(invalidDto)).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle null DTO gracefully', () => {
      expect(() => {
        SearchMapper.searchRequestToDomain(null as unknown as Parameters<typeof SearchMapper.searchRequestToDomain>[0]);
      }).toThrow();

      expect(() => {
        SearchMapper.searchResultsToDto(null as unknown as Parameters<typeof SearchMapper.searchResultsToDto>[0]);
      }).toThrow();

      expect(() => {
        SearchMapper.searchResultToDto(null as unknown as Parameters<typeof SearchMapper.searchResultToDto>[0]);
      }).toThrow();

      expect(() => {
        SearchMapper.facetToDto(null as unknown as Parameters<typeof SearchMapper.facetToDto>[0]);
      }).toThrow();
    });

    it('should handle undefined DTO gracefully', () => {
      expect(() => {
        SearchMapper.searchRequestToDomain(undefined as unknown as Parameters<typeof SearchMapper.searchRequestToDomain>[0]);
      }).toThrow();

      expect(() => {
        SearchMapper.searchResultsToDto(undefined as unknown as Parameters<typeof SearchMapper.searchResultsToDto>[0]);
      }).toThrow();
    });

    it('should handle invalid domain objects', () => {
      const invalidDomain = {
        // Missing required fields
      } as Parameters<typeof SearchMapper.searchResultToDto>[0];

      expect(() => {
        SearchMapper.searchResultToDto(invalidDomain);
      }).toThrow();
    });
  });

  describe('data integrity', () => {
    it('should preserve data integrity in search request mapping', () => {
      const originalDto: ProductSearchRequestDto = {
        query: 'test search',
        filters: {
          category: 'electronics',
          priceRange: { min: 100, max: 1000 },
          inStock: true,
          rating: { min: 4 },
          location: {
            latitude: 40.7128,
            longitude: -74.006,
            radius: 10
          }
        },
        sorting: { field: 'relevance', direction: 'desc' },
        pagination: { page: 1, limit: 20 },
        searchOptions: {
          strategy: 'hybrid',
          scope: 'products',
          includeFacets: true,
          includeSuggestions: true,
          fuzzyThreshold: 0.8
        },
        context: {
          userId: 'user-123',
          sessionId: 'session-456',
          userPreferences: {
            preferredCategories: ['electronics', 'mobile'],
            priceSensitivity: 'medium',
            qualityPreference: 'standard'
          },
          searchHistory: ['phone', 'laptop']
        }
      };

      SearchMapper.searchRequestToDomain(originalDto);
      const roundtripDto = SearchMapper.searchResultsToDto({
        results: [],
        total: 0,
        pagination: originalDto.pagination,
        searchMetadata: {
          query: originalDto.query || '',
          filtersApplied: Object.keys(originalDto.filters),
          executionTime: 0,
          searchEngine: 'elasticsearch',
          strategyUsed: originalDto.searchOptions.strategy || 'exact',
          totalDocumentsSearched: 0
        }
      });

      expect(roundtripDto.pagination).toEqual(originalDto.pagination);
      expect(roundtripDto.searchMetadata.query).toBe(originalDto.query);
      expect(roundtripDto.searchMetadata.strategyUsed).toBe(originalDto.searchOptions.strategy);
    });

    it('should preserve data integrity in search result mapping', () => {
      const originalResult = {
        productId: 'integrity-result',
        name: 'Integrity Test Product',
        description: 'Testing search result integrity',
        price: { amount: 299.99, currency: 'USD', originalPrice: 399.99, discountPercentage: 25 },
        category: { id: 'cat-integrity', name: 'Integrity Category', path: ['Test', 'Category'] },
        seller: { id: 'seller-integrity', name: 'Integrity Seller', rating: 4.7 },
        type: 'PHYSICAL',
        tags: ['integrity', 'test', 'search'],
        status: 'active',
        relevanceScore: 0.95,
        matchReasons: ['query_match', 'category_boost', 'rating_boost'],
        highlights: {
          name: ['<em>Integrity</em> Test Product'],
          description: ['Testing <em>search</em> result integrity']
        },
        media: [
          { url: 'integrity1.jpg', type: 'image', isPrimary: true },
          { url: 'integrity2.jpg', type: 'image', isPrimary: false }
        ],
        inventory: { available: 50, status: 'in_stock' },
        rating: { average: 4.5, count: 120 },
        analytics: { viewCount: 1000, purchaseCount: 50, conversionRate: 0.05 },
        distance: 2.5,
        personalizedScore: 0.88,
        createdAt: new Date('2023-06-01T10:00:00Z'),
        updatedAt: new Date('2023-06-15T14:30:00Z')
      };

      const dto = SearchMapper.searchResultToDto(originalResult as unknown as Parameters<typeof SearchMapper.searchResultToDto>[0]);

      expect(dto.productId).toBe('integrity-result');
      expect(dto.name).toBe('Integrity Test Product');
      expect(dto.description).toBe('Testing search result integrity');
      expect(dto.price).toEqual({
        amount: 299.99,
        currency: 'USD',
        originalPrice: 399.99,
        discountPercentage: 25
      });
      expect(dto.category).toEqual({
        id: 'cat-integrity',
        name: 'Integrity Category',
        path: ['Test', 'Category']
      });
      expect(dto.seller).toEqual({
        id: 'seller-integrity',
        name: 'Integrity Seller',
        rating: 4.7
      });
      expect(dto.type).toBe('PHYSICAL');
      expect(dto.tags).toEqual(['integrity', 'test', 'search']);
      expect(dto.status).toBe('active');
      expect(dto.relevanceScore).toBe(0.95);
      expect(dto.matchReasons).toEqual(['query_match', 'category_boost', 'rating_boost']);
      expect(dto.highlights).toEqual({
        name: ['<em>Integrity</em> Test Product'],
        description: ['Testing <em>search</em> result integrity']
      });
      expect(dto.media).toHaveLength(2);
      expect(dto.inventory).toEqual({ available: 50, status: 'in_stock' });
      expect(dto.rating).toEqual({ average: 4.5, count: 120 });
      expect(dto.analytics).toEqual({ viewCount: 1000, purchaseCount: 50, conversionRate: 0.05 });
      expect(dto.distance).toBe(2.5);
      expect(dto.personalizedScore).toBe(0.88);
      expect(dto.createdAt).toEqual(new Date('2023-06-01T10:00:00Z'));
      expect(dto.updatedAt).toEqual(new Date('2023-06-15T14:30:00Z'));
    });
  });
});
