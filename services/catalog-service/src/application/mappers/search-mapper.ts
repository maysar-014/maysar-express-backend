/**
 * Search Mapper
 * Bidirectional mapping for search-related operations
 * Handles search requests, results, and analytics transformations
 */

import {
  ProductSearchRequestDto,
  ProductSearchResponseDto,
  ProductSearchResultDto,
  SearchFacetDto,
  SearchSuggestionDto,
  SearchAnalyticsDto,
  AdvancedSearchRequestDto,
  SearchTemplateDto,
  SearchConfigurationDto,
  SearchValidationRequestDto,
  SearchValidationResponseDto
} from '../dto/search-dto';

type SearchDomainRecord = {
  query?: string;
  filters?: unknown;
  sorting?: unknown;
  pagination?: {
    page?: number;
    limit?: number;
    [key: string]: unknown;
  };
  searchOptions?: unknown;
  context?: unknown;
  results?: SearchDomainRecord[];
  total?: number;
  facets?: SearchDomainRecord[];
  suggestions?: SearchDomainRecord[];
  analytics?: SearchDomainRecord;
  searchMetadata?: unknown;
  productId?: string;
  name?: string;
  description?: string;
  price?: number;
  category?: string;
  seller?: unknown;
  type?: string;
  tags?: string[];
  status?: string;
  relevanceScore?: number;
  matchReasons?: unknown;
  highlights?: unknown;
  media?: unknown;
  inventory?: unknown;
  rating?: unknown;
  distance?: number;
  personalizedScore?: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  field?: string;
  label?: string;
  values?: unknown;
  ranges?: unknown;
  metadata?: Record<string, unknown>;
  queryAnalysis?: unknown;
  performance?: unknown;
  userBehavior?: unknown;
  searchPatterns?: unknown;
  templateId?: string;
  operationType?: string;
  baseQuery?: string;
  variables?: unknown[];
  isActive?: boolean;
  usageCount?: number;
  createdBy?: string;
  queryOptions?: Record<string, unknown>;
  resultOptions?: {
    fields?: unknown[];
    [key: string]: unknown;
  };
  personalization?: {
    enablePersonalization?: boolean;
    [key: string]: unknown;
  };
  options?: unknown;
  warnings?: unknown;
  errors?: unknown;
  isValid?: boolean;
  corrections?: unknown;
  [key: string]: unknown;
};

/**
 * Search Mapper
 * Handles transformations between search domain objects and DTOs
 * Includes validation and performance optimizations
 */
export class SearchMapper {
  /**
   * Map search request DTO to domain search query
   */
  static searchRequestToDomain(dto: ProductSearchRequestDto): SearchDomainRecord {
    return {
      query: dto.query,
      filters: dto.filters,
      sorting: dto.sorting,
      pagination: dto.pagination,
      searchOptions: dto.searchOptions,
      context: dto.context
    };
  }

  /**
   * Map domain search results to search response DTO
   */
  static searchResultsToDto(domain: SearchDomainRecord): ProductSearchResponseDto {
    return {
      results: domain.results?.map((result: SearchDomainRecord) => this.searchResultToDto(result)) ?? [],
      total: domain.total,
      facets: domain.facets?.map((facet: SearchDomainRecord) => this.facetToDto(facet)),
      suggestions: domain.suggestions?.map((suggestion: SearchDomainRecord) => this.suggestionToDto(suggestion)),
      analytics: domain.analytics ? this.analyticsToDto(domain.analytics) : undefined,
      pagination: domain.pagination,
      searchMetadata: domain.searchMetadata
    } as unknown as ProductSearchResponseDto;
  }

  /**
   * Map individual search result to DTO
   */
  static searchResultToDto(domain: SearchDomainRecord): ProductSearchResultDto {
    if (!domain || typeof domain !== 'object') {
      throw new Error('Invalid search result domain object');
    }

    const requiredFields = ['productId', 'name', 'price'];
    const missingField = requiredFields.find(
      field => domain[field] === undefined || domain[field] === null
    );
    if (missingField) {
      throw new Error(`Invalid search result domain object: missing ${missingField}`);
    }

    return {
      productId: domain.productId,
      name: domain.name,
      description: domain.description,
      price: domain.price,
      category: domain.category,
      seller: domain.seller,
      type: domain.type,
      tags: domain.tags,
      status: domain.status,
      relevanceScore: domain.relevanceScore,
      matchReasons: domain.matchReasons,
      highlights: domain.highlights,
      media: domain.media,
      inventory: domain.inventory,
      rating: domain.rating,
      analytics: domain.analytics,
      distance: domain.distance,
      personalizedScore: domain.personalizedScore,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt
    } as unknown as ProductSearchResultDto;
  }

  /**
   * Map search facet to DTO
   */
  static facetToDto(domain: SearchDomainRecord): SearchFacetDto {
    return {
      field: domain.field,
      label: domain.label,
      type: domain.type,
      values: domain.values,
      ranges: domain.ranges,
      metadata: domain.metadata
    } as unknown as SearchFacetDto;
  }

  /**
   * Map search suggestion to DTO
   */
  static suggestionToDto(domain: SearchDomainRecord): SearchSuggestionDto {
    return {
      type: domain.type,
      value: domain.value,
      label: domain.label,
      relevance: domain.relevance,
      reason: domain.reason,
      metadata: domain.metadata
    } as unknown as SearchSuggestionDto;
  }

  /**
   * Map search analytics to DTO
   */
  static analyticsToDto(domain: SearchDomainRecord): SearchAnalyticsDto {
    return {
      queryAnalysis: domain.queryAnalysis,
      performance: domain.performance,
      userBehavior: domain.userBehavior,
      searchPatterns: domain.searchPatterns
    } as unknown as SearchAnalyticsDto;
  }

  /**
   * Map advanced search request to domain
   */
  static advancedSearchRequestToDomain(dto: AdvancedSearchRequestDto): SearchDomainRecord {
    return {
      ...this.searchRequestToDomain(dto),
      queryOptions: dto.queryOptions,
      resultOptions: dto.resultOptions,
      personalization: dto.personalization
    };
  }

  /**
   * Map search template to domain
   */
  static searchTemplateToDomain(dto: SearchTemplateDto): SearchDomainRecord {
    return {
      templateId: dto.templateId,
      name: dto.name,
      description: dto.description,
      operationType: dto.category,
      baseQuery: dto.baseQuery,
      variables: dto.variables,
      isActive: dto.isActive,
      usageCount: dto.usageCount,
      createdBy: dto.createdBy,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
      tags: dto.tags
    } as unknown as SearchDomainRecord;
  }

  /**
   * Map domain search template to DTO
   */
  static searchTemplateToDto(domain: SearchDomainRecord): SearchTemplateDto {
    return {
      templateId: domain.templateId,
      name: domain.name,
      description: domain.description,
      category: domain.operationType,
      baseQuery: domain.baseQuery,
      variables: domain.variables,
      isActive: domain.isActive,
      usageCount: domain.usageCount,
      createdBy: domain.createdBy,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
      tags: domain.tags
    } as unknown as SearchTemplateDto;
  }

  /**
   * Map search configuration to domain
   */
  static searchConfigurationToDomain(dto: SearchConfigurationDto): SearchDomainRecord {
    return {
      searchEngine: dto.searchEngine,
      indexSettings: dto.indexSettings,
      searchSettings: dto.searchSettings,
      monitoring: dto.monitoring
    } as unknown as SearchDomainRecord;
  }

  /**
   * Map domain search configuration to DTO
   */
  static searchConfigurationToDto(domain: SearchDomainRecord): SearchConfigurationDto {
    return {
      searchEngine: domain.searchEngine,
      indexSettings: domain.indexSettings,
      searchSettings: domain.searchSettings,
      monitoring: domain.monitoring
    } as unknown as SearchConfigurationDto;
  }

  /**
   * Map search validation request to domain
   */
  static validationRequestToDomain(dto: SearchValidationRequestDto): SearchDomainRecord {
    return {
      query: dto.query,
      filters: dto.filters,
      options: dto.options
    } as unknown as SearchDomainRecord;
  }

  /**
   * Map search validation response to DTO
   */
  static validationResponseToDto(domain: SearchDomainRecord): SearchValidationResponseDto {
    return {
      isValid: domain.isValid,
      errors: domain.errors,
      warnings: domain.warnings,
      suggestions: domain.suggestions,
      performance: domain.performance,
      corrections: domain.corrections
    } as unknown as SearchValidationResponseDto;
  }

  /**
   * Batch mapping for search results
   */
  static searchResultsToDtoBatch(domainResults: SearchDomainRecord[]): ProductSearchResultDto[] {
    return domainResults.map(result => this.searchResultToDto(result));
  }

  /**
   * Batch mapping for search facets
   */
  static facetsToDtoBatch(domainFacets: SearchDomainRecord[]): SearchFacetDto[] {
    return domainFacets.map(facet => this.facetToDto(facet));
  }

  /**
   * Batch mapping for search suggestions
   */
  static suggestionsToDtoBatch(domainSuggestions: SearchDomainRecord[]): SearchSuggestionDto[] {
    return domainSuggestions.map(suggestion => this.suggestionToDto(suggestion));
  }

  /**
   * Validate search request DTO
   */
  static validateSearchRequest(dto: ProductSearchRequestDto): boolean {
    return !!(
      dto.sorting &&
      dto.pagination &&
      dto.searchOptions &&
      typeof dto.pagination.page === 'number' &&
      dto.pagination.page > 0 &&
      typeof dto.pagination.limit === 'number' &&
      dto.pagination.limit > 0 &&
      dto.pagination.limit <= 1000
    );
  }

  /**
   * Validate advanced search request DTO
   */
  static validateAdvancedSearchRequest(dto: AdvancedSearchRequestDto): boolean {
    return this.validateSearchRequest(dto) && !!(
      dto.queryOptions &&
      Object.keys(dto.queryOptions).length > 0 &&
      dto.resultOptions &&
      Array.isArray(dto.resultOptions.fields) &&
      dto.personalization &&
      typeof dto.personalization.enablePersonalization === 'boolean'
    );
  }

  /**
   * Validate search template DTO
   */
  static validateSearchTemplate(dto: SearchTemplateDto): boolean {
    return !!(
      dto.templateId &&
      dto.name &&
      ['user_segment', 'business_type', 'seasonal', 'promotional', 'custom'].includes(dto.category) &&
      dto.baseQuery &&
      Array.isArray(dto.variables) &&
      typeof dto.isActive === 'boolean' &&
      typeof dto.usageCount === 'number' &&
      dto.createdBy &&
      dto.createdAt instanceof Date &&
      dto.updatedAt instanceof Date
    );
  }
}

/**
 * Search Mapper Utilities
 */
export const searchMappers = {
  /**
   * Batch mappers
   */
  resultsToDtoBatch: SearchMapper.searchResultsToDtoBatch,
  facetsToDtoBatch: SearchMapper.facetsToDtoBatch,
  suggestionsToDtoBatch: SearchMapper.suggestionsToDtoBatch,

  /**
   * Validation functions
   */
  validateSearchRequest: SearchMapper.validateSearchRequest,
  validateAdvancedSearchRequest: SearchMapper.validateAdvancedSearchRequest,
  validateSearchTemplate: SearchMapper.validateSearchTemplate,

  /**
   * Individual mappers
   */
  searchRequestToDomain: SearchMapper.searchRequestToDomain,
  searchResultsToDto: SearchMapper.searchResultsToDto,
  searchResultToDto: SearchMapper.searchResultToDto,
  facetToDto: SearchMapper.facetToDto,
  suggestionToDto: SearchMapper.suggestionToDto,
  analyticsToDto: SearchMapper.analyticsToDto,
  advancedSearchRequestToDomain: SearchMapper.advancedSearchRequestToDomain,
  searchTemplateToDomain: SearchMapper.searchTemplateToDomain,
  searchTemplateToDto: SearchMapper.searchTemplateToDto,
  searchConfigurationToDomain: SearchMapper.searchConfigurationToDomain,
  searchConfigurationToDto: SearchMapper.searchConfigurationToDto,
  validationRequestToDomain: SearchMapper.validationRequestToDomain,
  validationResponseToDto: SearchMapper.validationResponseToDto
};
