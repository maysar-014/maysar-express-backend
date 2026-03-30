/**
 * Search Data Transfer Objects
 * Defines data structures for search-related operations
 * Application layer data contracts for search requests and responses
 */

/**
 * Search Strategy Types
 */
export type SearchStrategy = 'exact' | 'fuzzy' | 'semantic' | 'hybrid';
export type SearchScope = 'products' | 'categories' | 'sellers' | 'all';
export type SortDirection = 'asc' | 'desc';
export type SearchRecord = Record<string, unknown>;

type SearchRequestLike = {
  query?: unknown;
  filters?: unknown;
  sorting?: {
    field?: unknown;
    direction?: unknown;
  };
  pagination?: {
    page?: unknown;
    limit?: unknown;
  };
  searchOptions?: unknown;
};

type SearchResponseLike = {
  results?: unknown;
  total?: unknown;
  pagination?: unknown;
  searchMetadata?: unknown;
};

type SearchTemplateLike = {
  templateId?: unknown;
  name?: unknown;
  category?: unknown;
  baseQuery?: unknown;
  variables?: unknown;
  isActive?: unknown;
  usageCount?: unknown;
  createdBy?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

/**
 * Product Search Request DTO
 * Input contract for product search operations
 */
export interface ProductSearchRequestDto {
  query?: string;
  filters: {
    category?: string;
    categories?: string[];
    seller?: string;
    priceRange?: {
      min: number;
      max: number;
    };
    productType?: string;
    tags?: string[];
    inStock?: boolean;
    status?: string;
    rating?: {
      min: number;
      max?: number;
    };
    attributes?: SearchRecord;
    location?: {
      latitude: number;
      longitude: number;
      radius: number; // in kilometers
    };
    dateRange?: {
      from: Date;
      to: Date;
    };
  };
  sorting: {
    field: 'relevance' | 'price' | 'rating' | 'newest' | 'popularity' | 'distance' | 'name';
    direction: SortDirection;
  };
  pagination: {
    page: number;
    limit: number;
  };
  searchOptions: {
    strategy?: SearchStrategy;
    scope?: SearchScope;
    includeFacets?: boolean;
    includeSuggestions?: boolean;
    includeAnalytics?: boolean;
    fuzzyThreshold?: number;
    boostRecent?: boolean;
  };
  context?: {
    userId?: string;
    sessionId?: string;
    userPreferences?: {
      preferredCategories?: string[];
      priceSensitivity?: 'low' | 'medium' | 'high';
      qualityPreference?: 'budget' | 'standard' | 'premium';
    };
    searchHistory?: string[];
  };
}

/**
 * Product Search Response DTO
 * Output contract for product search results
 */
export interface ProductSearchResponseDto {
  results: ProductSearchResultDto[];
  total: number;
  facets?: SearchFacetDto[];
  suggestions?: SearchSuggestionDto[];
  analytics?: SearchAnalyticsDto;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    totalResults: number;
  };
  searchMetadata: {
    query: string;
    filtersApplied: string[];
    executionTime: number;
    searchEngine: string;
    cacheHit?: boolean;
    strategyUsed: SearchStrategy;
    totalDocumentsSearched: number;
    relevanceThreshold?: number;
  };
}

/**
 * Product Search Result DTO
 * Individual search result item
 */
export interface ProductSearchResultDto {
  productId: string;
  name: string;
  description: string;
  price: {
    amount: number;
    currency: string;
    originalPrice?: number;
    discountPercentage?: number;
  };
  category: {
    id: string;
    name: string;
    path?: string[];
  };
  seller: {
    id: string;
    name: string;
    rating?: number;
  };
  type: string;
  tags: string[];
  status: string;
  relevanceScore: number;
  matchReasons: string[];
  highlights?: Record<string, string[]>; // field -> highlighted snippets
  media: Array<{
    url: string;
    type: 'image' | 'video';
    altText?: string;
    isPrimary: boolean;
  }>;
  inventory: {
    available: number;
    status: 'in_stock' | 'low_stock' | 'out_of_stock';
  };
  rating: {
    average: number;
    count: number;
  };
  analytics: {
    viewCount: number;
    purchaseCount: number;
    conversionRate?: number;
  };
  distance?: number; // in kilometers, if location-based search
  personalizedScore?: number; // adjusted for user preferences
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Search Facet DTO
 * Faceted search navigation data
 */
export interface SearchFacetDto {
  field: string;
  label: string;
  type: 'value' | 'range' | 'date_range';
  values: Array<{
    value: string;
    label: string;
    count: number;
    selected?: boolean;
    children?: Array<{
      value: string;
      label: string;
      count: number;
      selected?: boolean;
    }>;
  }>;
  ranges?: Array<{
    range: string;
    min: number;
    max: number;
    count: number;
    selected?: boolean;
  }>;
  metadata?: {
    totalValues: number;
    hasMore: boolean;
    sortOrder: 'count' | 'alpha';
  };
}

/**
 * Search Suggestion DTO
 * Search suggestions and recommendations
 */
export interface SearchSuggestionDto {
  type: 'query_correction' | 'query_completion' | 'related_search' | 'popular_search' | 'category_suggestion' | 'trending';
  value: string;
  label?: string;
  relevance: number;
  reason?: string;
  metadata?: {
    popularity?: number;
    trendDirection?: 'up' | 'down' | 'stable';
    category?: string;
    confidence?: number;
  };
}

/**
 * Search Analytics DTO
 * Search performance and behavior analytics
 */
export interface SearchAnalyticsDto {
  queryAnalysis: {
    originalQuery: string;
    processedQuery: string;
    detectedIntent?: string;
    entities?: Array<{
      type: string;
      value: string;
      confidence: number;
    }>;
    sentiment?: 'positive' | 'neutral' | 'negative';
  };
  performance: {
    totalResults: number;
    relevantResults: number;
    precision: number;
    recall: number;
    f1Score: number;
    averageRelevanceScore: number;
  };
  userBehavior: {
    clickThroughRate?: number;
    conversionRate?: number;
    averageDwellTime?: number;
    bounceRate?: number;
    abandonmentRate?: number;
  };
  searchPatterns: {
    commonTerms: Array<{
      term: string;
      frequency: number;
      trend: 'increasing' | 'decreasing' | 'stable';
    }>;
    popularCategories: Array<{
      category: string;
      searchCount: number;
      conversionRate?: number;
    }>;
    priceSensitivity: {
      averageMinPrice: number;
      averageMaxPrice: number;
      priceRangeUsage: number;
    };
  };
}

/**
 * Advanced Search Request DTO
 * Extended search capabilities for power users
 */
export interface AdvancedSearchRequestDto extends ProductSearchRequestDto {
  queryOptions: {
    booleanOperators?: boolean;
    fieldBoosting?: Record<string, number>;
    minimumShouldMatch?: string;
    tieBreaker?: number;
    explain?: boolean;
  };
  resultOptions: {
    fields?: string[];
    aggregations?: Array<{
      name: string;
      type: 'terms' | 'range' | 'date_histogram' | 'stats';
      field: string;
      options?: SearchRecord;
    }>;
    highlighting?: {
      fields: string[];
      preTag: string;
      postTag: string;
      fragmentSize?: number;
      numberOfFragments?: number;
    };
  };
  personalization: {
    enablePersonalization: boolean;
    userProfile?: {
      preferences: SearchRecord;
      behaviorHistory: Array<{
        action: 'view' | 'purchase' | 'favorite' | 'share';
        productId: string;
        timestamp: Date;
        weight: number;
      }>;
    };
    contextSignals?: {
      timeOfDay: number;
      dayOfWeek: number;
      season: string;
      location?: {
        latitude: number;
        longitude: number;
      };
      deviceType?: string;
      referrer?: string;
    };
  };
}

/**
 * Search Template DTO
 * Reusable search configurations
 */
export interface SearchTemplateDto {
  templateId: string;
  name: string;
  description?: string;
  category: 'user_segment' | 'business_type' | 'seasonal' | 'promotional' | 'custom';
  baseQuery: Partial<ProductSearchRequestDto>;
  variables: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date' | 'array';
    required: boolean;
    defaultValue?: unknown;
    validation?: {
      min?: number;
      max?: number;
      pattern?: string;
      enum?: string[];
    };
  }>;
  isActive: boolean;
  usageCount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
}

/**
 * Search Configuration DTO
 * Search engine configuration and settings
 */
export interface SearchConfigurationDto {
  searchEngine: {
    type: 'elasticsearch' | 'opensearch' | 'solr' | 'custom';
    version: string;
    endpoints: string[];
    authentication?: {
      type: 'basic' | 'api_key' | 'oauth';
      credentials: SearchRecord;
    };
  };
  indexSettings: {
    name: string;
    mappings: SearchRecord;
    settings: {
      replicas: number;
      shards: number;
      refreshInterval: string;
      analysis: {
        analyzers: SearchRecord;
        tokenizers: SearchRecord;
        filters: SearchRecord;
      };
    };
  };
  searchSettings: {
    defaultStrategy: SearchStrategy;
    fuzzyMatching: {
      enabled: boolean;
      prefixLength: number;
      maxExpansions: number;
      similarity: number;
    };
    relevance: {
      boostFactors: Record<string, number>;
      decayFunctions: Array<{
        field: string;
        type: 'exp' | 'gauss' | 'linear';
        scale: string;
        decay: number;
      }>;
    };
    caching: {
      enabled: boolean;
      ttl: number;
      maxSize: number;
    };
  };
  monitoring: {
    metricsEnabled: boolean;
    slowQueryThreshold: number;
    indexStats: boolean;
    queryProfiling: boolean;
  };
}

/**
 * Search Validation Request DTO
 * Input for search query validation
 */
export interface SearchValidationRequestDto {
  query?: string;
  filters?: ProductSearchRequestDto['filters'];
  options?: {
    strictValidation?: boolean;
    suggestCorrections?: boolean;
    checkPerformance?: boolean;
  };
}

/**
 * Search Validation Response DTO
 * Output for search validation results
 */
export interface SearchValidationResponseDto {
  isValid: boolean;
  errors: Array<{
    field: string;
    code: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
  }>;
  warnings: Array<{
    field: string;
    message: string;
    suggestion?: string;
  }>;
  suggestions: Array<{
    type: 'query_improvement' | 'filter_optimization' | 'performance_enhancement';
    message: string;
    field?: string;
    impact: 'low' | 'medium' | 'high';
  }>;
  performance: {
    estimatedExecutionTime: number;
    estimatedResultCount: number;
    complexity: 'simple' | 'medium' | 'complex';
    optimizationOpportunities: string[];
  };
  corrections?: {
    originalQuery: string;
    correctedQuery: string;
    confidence: number;
    alternatives: string[];
  };
}

/**
 * Type guards for runtime type checking
 */
export function isProductSearchRequestDto(obj: unknown): obj is ProductSearchRequestDto {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return false;
  }

  const candidate = obj as SearchRequestLike;
  return (
    (!candidate.query || typeof candidate.query === 'string') &&
    !!candidate.filters &&
    typeof candidate.filters === 'object' &&
    !!candidate.sorting &&
    typeof candidate.sorting === 'object' &&
    ['relevance', 'price', 'rating', 'newest', 'popularity', 'distance', 'name'].includes(candidate.sorting.field as string) &&
    ['asc', 'desc'].includes(candidate.sorting.direction as SortDirection) &&
    !!candidate.pagination &&
    typeof candidate.pagination === 'object' &&
    typeof candidate.pagination.page === 'number' &&
    candidate.pagination.page >= 1 &&
    typeof candidate.pagination.limit === 'number' &&
    candidate.pagination.limit >= 1 &&
    !!candidate.searchOptions &&
    typeof candidate.searchOptions === 'object'
  );
}

export function isProductSearchResponseDto(obj: unknown): obj is ProductSearchResponseDto {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return false;
  }

  const candidate = obj as SearchResponseLike;
  return (
    Array.isArray(candidate.results) &&
    typeof candidate.total === 'number' &&
    !!candidate.pagination &&
    typeof candidate.pagination === 'object' &&
    !!candidate.searchMetadata &&
    typeof candidate.searchMetadata === 'object'
  );
}

export function isSearchTemplateDto(obj: unknown): obj is SearchTemplateDto {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return false;
  }

  const candidate = obj as SearchTemplateLike;
  return (
    typeof candidate.templateId === 'string' &&
    typeof candidate.name === 'string' &&
    ['user_segment', 'business_type', 'seasonal', 'promotional', 'custom'].includes(candidate.category as string) &&
    !!candidate.baseQuery &&
    typeof candidate.baseQuery === 'object' &&
    Array.isArray(candidate.variables) &&
    typeof candidate.isActive === 'boolean' &&
    typeof candidate.usageCount === 'number' &&
    !!candidate.createdBy &&
    candidate.createdAt instanceof Date &&
    candidate.updatedAt instanceof Date
  );
}

/**
 * DTO Factory Functions
 * Helper functions for creating validated DTOs
 */
export function createProductSearchRequest(data: unknown): ProductSearchRequestDto {
  if (!isProductSearchRequestDto(data)) {
    throw new Error('Invalid ProductSearchRequestDto data');
  }

  return {
    ...data,
    filters: { ...data.filters },
    sorting: { ...data.sorting },
    pagination: { ...data.pagination },
    searchOptions: { ...data.searchOptions },
    context: data.context ? { ...data.context } : undefined
  };
}

export function createSearchTemplate(data: unknown): SearchTemplateDto {
  if (!isSearchTemplateDto(data)) {
    throw new Error('Invalid SearchTemplateDto data');
  }

  return {
    ...data,
    variables: [...(data.variables || [])],
    tags: data.tags ? [...data.tags] : undefined
  };
}
