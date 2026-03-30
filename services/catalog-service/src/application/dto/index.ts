/**
 * Application DTOs Index
 * Central export point for all application layer data transfer objects
 * Defines contracts between presentation and application layers
 */

// Product DTOs
export * from './product.dto';

// Pricing DTOs
export * from './pricing-dto';

// Search DTOs
export * from './search-dto';

// Bulk Operation DTOs
export * from './bulk-operation-dto';

/**
 * Common DTO Patterns
 * Shared patterns and utilities for DTOs
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata?: {
    timestamp: Date;
    requestId: string;
    version: string;
    executionTime?: number;
  };
}

export interface PaginatedResponse<T = unknown> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  metadata?: {
    timestamp: Date;
    requestId: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    filters?: Record<string, unknown>;
  };
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  value?: unknown;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings?: ValidationError[];
}

/**
 * Request Context
 * Common context information passed through application layer
 */
export interface RequestContext {
  userId?: string;
  sessionId?: string;
  requestId: string;
  timestamp: Date;
  userAgent?: string;
  ipAddress?: string;
  permissions?: string[];
  tenantId?: string;
  locale?: string;
  currency?: string;
}

/**
 * Application Event DTOs
 * Data structures for application-level events
 */
export interface ApplicationEventDto<T = unknown> {
  eventId: string;
  eventType: string;
  aggregateId: string;
  payload: T;
  metadata: {
    timestamp: Date;
    userId?: string;
    sessionId?: string;
    requestId: string;
    source: string;
    version: string;
  };
}

/**
 * Cache DTOs
 * Data structures for caching operations
 */
export interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  ttl?: number;
  tags?: string[];
  metadata: {
    createdAt: Date;
    expiresAt?: Date;
    hits: number;
    lastAccessed?: Date;
  };
}

export interface CacheInvalidationRequest {
  keys?: string[];
  tags?: string[];
  pattern?: string;
  scope: 'global' | 'tenant' | 'user';
}

/**
 * Search DTOs
 * Common search-related data structures
 */
export interface SearchFilters {
  [key: string]: unknown;
}

export interface SearchSorting {
  field: string;
  direction: 'asc' | 'desc';
}

export interface SearchPagination {
  page: number;
  limit: number;
  offset?: number;
}

export interface SearchRequest {
  query?: string;
  filters?: SearchFilters;
  sorting?: SearchSorting;
  pagination?: SearchPagination;
  includeFacets?: boolean;
  includeSuggestions?: boolean;
}

export interface SearchFacet {
  field: string;
  values: Array<{
    value: string;
    label: string;
    count: number;
  }>;
}

export interface SearchSuggestion {
  type: 'query' | 'category' | 'brand' | 'tag';
  value: string;
  relevance: number;
}

export interface SearchResponse<T = unknown> {
  results: T[];
  total: number;
  facets?: SearchFacet[];
  suggestions?: SearchSuggestion[];
  pagination?: {
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  metadata: {
    query: string;
    executionTime: number;
    totalResults: number;
    searchEngine: string;
  };
}
