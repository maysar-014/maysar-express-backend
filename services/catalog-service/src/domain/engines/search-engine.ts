/**
 * Search Engine
 * Domain engine for product search and filtering logic.
 * 
 * Performance Envelope:
 * - Expected QPS: 200-500 depending on query complexity.
 * - Memory Limit: 512MB (cached product metadata).
 * - Indexing Strategy: GIN indexes on tags, B-Tree on category/brand/price.
 * 
 * Strategy Responsibilities:
 * - TextSearchStrategy: Handles tokenization and relevance scoring.
 * - FilterStrategy: Handles Boolean filtering and range checks.
 */

import { ProductId, SellerId } from '../value-objects/ids.value-object';
import { Price } from '../value-objects/monetary.value-object';
import { ProductType, ProductStatus, ProductVisibility } from '../value-objects/product-types.value-object';

export interface SearchableProduct {
  productId: ProductId;
  sellerId: SellerId;
  name: string;
  description: string;
  type: ProductType;
  status: ProductStatus;
  visibility: ProductVisibility;
  price: Price;
  originalPrice?: Price;
  tags: string[];
  category: string;
  subcategory?: string;
  brand?: string;
  sku?: string;
  averageRating: number;
  reviewCount: number;
  inStock: boolean;
  isOnSale: boolean;
  popularityScore: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchQuery {
  text?: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  productType?: ProductType;
  inStockOnly?: boolean;
  onSaleOnly?: boolean;
  minRating?: number;
  tags?: string[];
  sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'popularity' | 'newest';
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  productId: ProductId;
  relevanceScore: number;
  matchReasons: string[];
  highlights?: Record<string, string[]>;
}

export interface FacetResult {
  name: string;
  value: string;
  count: number;
  selected: boolean;
}

export interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
  facets: {
    categories: FacetResult[];
    brands: FacetResult[];
    priceRanges: FacetResult[];
    ratings: FacetResult[];
    productTypes: FacetResult[];
  };
  query: SearchQuery;
  executionTime: number;
}

export class TextSearchStrategy {
  /**
   * Executes a text-based search across a list of products.
   * 
   * @param query - The search query containing the text to look for.
   * @param products - The collection of searchable products.
   * @returns A sorted array of search results with relevance scores.
   */
  search(query: SearchQuery, products: SearchableProduct[]): SearchResult[] {
    if (!query.text) return [];

    const searchTerms = this.tokenizeQuery(query.text.toLowerCase());
    const results: SearchResult[] = [];

    for (const product of products) {
      const score = this.calculateTextRelevance(product, searchTerms);
      if (score > 0) {
        const matchReasons = this.getMatchReasons(product, searchTerms);
        const highlights = this.generateHighlights(product, searchTerms);

        results.push({
          productId: product.productId,
          relevanceScore: score,
          matchReasons,
          highlights
        });
      }
    }

    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  private tokenizeQuery(query: string): string[] {
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    return query
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word))
      .map(word => word.toLowerCase());
  }

  /**
   * Calculates a relevance score for a product based on weighted text matches.
   * 
   * Weights:
   * - Name match: 10 pts
   * - Description match: 5 pts
   * - Tags/Category match: 2 pts
   * - Fuzzy match: 0.5 pts per word
   * - Exact phrase in name: 1.5x multiplier
   */
  private calculateTextRelevance(product: SearchableProduct, searchTerms: string[]): number {
    let totalScore = 0;
    const searchableText = [
      product.name,
      product.description,
      product.category,
      product.subcategory,
      product.brand,
      ...product.tags
    ].join(' ').toLowerCase();

    for (const term of searchTerms) {
      if (product.name.toLowerCase().includes(term)) {
        totalScore += 10;
      }
      else if (product.description.toLowerCase().includes(term)) {
        totalScore += 5;
      }
      else if (searchableText.includes(term)) {
        totalScore += 2;
      }
      else {
        const fuzzyMatches = searchableText.split(/\s+/).filter(word =>
          word.includes(term) || term.includes(word) || this.levenshteinDistance(word, term) <= 2
        );
        totalScore += fuzzyMatches.length * 0.5;
      }
    }

    const queryPhrase = searchTerms.join(' ');
    if (product.name.toLowerCase().includes(queryPhrase)) {
      totalScore *= 1.5;
    }

    return totalScore;
  }

  private levenshteinDistance(a: string, b: string): number {
    if (a === b) return 0;
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    let [short, long] = a.length < b.length ? [a, b] : [b, a];
    let prevRow = Array.from({ length: short.length + 1 }, (_, i) => i);
    let currRow = new Array(short.length + 1);

    for (let i = 1; i <= long.length; i++) {
      currRow[0] = i;
      for (let j = 1; j <= short.length; j++) {
        const cost = long[i - 1] === short[j - 1] ? 0 : 1;
        currRow[j] = Math.min(
          prevRow[j] + 1,
          currRow[j - 1] + 1,
          prevRow[j - 1] + cost
        );
      }
      [prevRow, currRow] = [currRow, prevRow];
    }

    return prevRow[short.length];
  }

  private getMatchReasons(product: SearchableProduct, searchTerms: string[]): string[] {
    const reasons: string[] = [];

    for (const term of searchTerms) {
      if (product.name.toLowerCase().includes(term)) {
        reasons.push(`Name contains "${term}"`);
      }
      if (product.description.toLowerCase().includes(term)) {
        reasons.push(`Description contains "${term}"`);
      }
      if (product.tags.some(tag => tag.toLowerCase().includes(term))) {
        reasons.push(`Tag contains "${term}"`);
      }
      if (product.category.toLowerCase().includes(term)) {
        reasons.push(`Category contains "${term}"`);
      }
    }

    return Array.from(new Set(reasons)); // Remove duplicates
  }

  private generateHighlights(product: SearchableProduct, searchTerms: string[]): Record<string, string[]> {
    const highlights: Record<string, string[]> = {};

    for (const term of searchTerms) {
      const nameHighlights = this.findHighlights(product.name, term);
      if (nameHighlights.length > 0) {
        highlights.name = highlights.name || [];
        highlights.name.push(...nameHighlights);
      }

      const descHighlights = this.findHighlights(product.description, term);
      if (descHighlights.length > 0) {
        highlights.description = highlights.description || [];
        highlights.description.push(...descHighlights);
      }
    }

    return highlights;
  }

  private findHighlights(text: string, term: string): string[] {
    const highlights: string[] = [];
    const words = text.split(/\s+/);
    const termLower = term.toLowerCase();

    for (let i = 0; i < words.length; i++) {
      if (words[i].toLowerCase().includes(termLower)) {
        const start = Math.max(0, i - 2);
        const end = Math.min(words.length, i + 3);
        const snippet = words.slice(start, end).join(' ');
        highlights.push(snippet);
      }
    }

    return highlights.slice(0, 3); // Limit to 3 highlights
  }
}

export class FilterStrategy {
  /**
   * Filters a list of products based on category, price, stock, ratings, and tags.
   */
  applyFilters(query: SearchQuery, products: SearchableProduct[]): SearchableProduct[] {
    return products.filter(product => {
      // Category filter
      if (query.category && product.category !== query.category) {
        return false;
      }

      // Subcategory filter
      if (query.subcategory && product.subcategory !== query.subcategory) {
        return false;
      }

      // Brand filter
      if (query.brand && product.brand !== query.brand) {
        return false;
      }

      // Price range filter
      if (query.minPrice !== undefined && product.price.toNumber() < query.minPrice) {
        return false;
      }
      if (query.maxPrice !== undefined && product.price.toNumber() > query.maxPrice) {
        return false;
      }

      // Product type filter
      if (query.productType && product.type !== query.productType) {
        return false;
      }

      // Stock status filter
      if (query.inStockOnly && !product.inStock) {
        return false;
      }

      // Sale status filter
      if (query.onSaleOnly && !product.isOnSale) {
        return false;
      }

      // Rating filter
      if (query.minRating !== undefined && product.averageRating < query.minRating) {
        return false;
      }

      // Tags filter
      if (query.tags && query.tags.length > 0) {
        const hasAllTags = query.tags.every(tag =>
          product.tags.some(productTag =>
            productTag.toLowerCase().includes(tag.toLowerCase())
          )
        );
        if (!hasAllTags) {
          return false;
        }
      }

      // Visibility filter (only show public products by default)
      if (product.visibility !== ProductVisibility.PUBLIC && product.visibility !== ProductVisibility.B2B_ONLY) {
        return false;
      }

      // Status filter (only show published products)
      if (product.status !== ProductStatus.PUBLISHED) {
        return false;
      }

      return true;
    });
  }
}

export class SortStrategy {
  /**
   * Sorts search results by relevance, price, rating, or popularity.
   */
  sort(results: SearchResult[], query: SearchQuery, products: SearchableProduct[]): SearchResult[] {
    const sortBy = query.sortBy || 'relevance';

    const productMap = new Map(products.map(p => [p.productId.toString(), p]));

    return results.sort((a, b) => {
      switch (sortBy) {
        case 'price_asc':
          const priceA = productMap.get(a.productId.toString())?.price.toNumber() || 0;
          const priceB = productMap.get(b.productId.toString())?.price.toNumber() || 0;
          return priceA - priceB;

        case 'price_desc':
          const priceDescA = productMap.get(a.productId.toString())?.price.toNumber() || 0;
          const priceDescB = productMap.get(b.productId.toString())?.price.toNumber() || 0;
          return priceDescB - priceDescA;

        case 'rating':
          const ratingA = productMap.get(a.productId.toString())?.averageRating || 0;
          const ratingB = productMap.get(b.productId.toString())?.averageRating || 0;
          if (ratingB !== ratingA) return ratingB - ratingA;
          // Secondary sort by review count
          const reviewsA = productMap.get(a.productId.toString())?.reviewCount || 0;
          const reviewsB = productMap.get(b.productId.toString())?.reviewCount || 0;
          return reviewsB - reviewsA;

        case 'popularity':
          const popA = productMap.get(a.productId.toString())?.popularityScore || 0;
          const popB = productMap.get(b.productId.toString())?.popularityScore || 0;
          return popB - popA;

        case 'newest':
          const dateA = productMap.get(a.productId.toString())?.createdAt || new Date(0);
          const dateB = productMap.get(b.productId.toString())?.createdAt || new Date(0);
          return dateB.getTime() - dateA.getTime();

        case 'relevance':
        default:
          return b.relevanceScore - a.relevanceScore;
      }
    });
  }
}

export class FacetStrategy {
  /**
   * Aggregates facet counts for categories, brands, price ranges, and ratings.
   */
  generateFacets(products: SearchableProduct[], query: SearchQuery): SearchResponse['facets'] {
    const facets = {
      categories: [] as FacetResult[],
      brands: [] as FacetResult[],
      priceRanges: [] as FacetResult[],
      ratings: [] as FacetResult[],
      productTypes: [] as FacetResult[]
    };

    // Category facets
    const categoryCounts = new Map<string, number>();
    products.forEach(product => {
      const count = categoryCounts.get(product.category) || 0;
      categoryCounts.set(product.category, count + 1);
    });
    facets.categories = Array.from(categoryCounts.entries()).map(([value, count]) => ({
      name: 'category',
      value,
      count,
      selected: query.category === value
    }));

    // Brand facets
    const brandCounts = new Map<string, number>();
    products.forEach(product => {
      if (product.brand) {
        const count = brandCounts.get(product.brand) || 0;
        brandCounts.set(product.brand, count + 1);
      }
    });
    facets.brands = Array.from(brandCounts.entries()).map(([value, count]) => ({
      name: 'brand',
      value,
      count,
      selected: query.brand === value
    }));

    // Price range facets
    const priceRanges = [
      { label: 'Under $25', min: 0, max: 25 },
      { label: '$25 - $50', min: 25, max: 50 },
      { label: '$50 - $100', min: 50, max: 100 },
      { label: '$100 - $200', min: 100, max: 200 },
      { label: 'Over $200', min: 200, max: Infinity }
    ];

    facets.priceRanges = priceRanges.map(range => {
      const count = products.filter(p => {
        const price = p.price.toNumber();
        return price >= range.min && price < range.max;
      }).length;

      return {
        name: 'price_range',
        value: range.label,
        count,
        selected: false // Would need more complex logic for range selection
      };
    });

    // Rating facets
    const ratingRanges = [
      { label: '4+ stars', min: 4.0 },
      { label: '3+ stars', min: 3.0 },
      { label: '2+ stars', min: 2.0 },
      { label: '1+ star', min: 1.0 }
    ];

    facets.ratings = ratingRanges.map(range => {
      const count = products.filter(p => p.averageRating >= range.min).length;
      return {
        name: 'rating',
        value: range.label,
        count,
        selected: query.minRating === range.min
      };
    });

    // Product type facets
    const typeCounts = new Map<ProductType, number>();
    products.forEach(product => {
      const count = typeCounts.get(product.type) || 0;
      typeCounts.set(product.type, count + 1);
    });
    facets.productTypes = Array.from(typeCounts.entries()).map(([value, count]) => ({
      name: 'product_type',
      value,
      count,
      selected: query.productType === value
    }));

    return facets;
  }
}

export class ProductSearchEngine {
  constructor(
    private readonly textSearchStrategy: TextSearchStrategy = new TextSearchStrategy(),
    private readonly filterStrategy: FilterStrategy = new FilterStrategy(),
    private readonly sortStrategy: SortStrategy = new SortStrategy(),
    private readonly facetStrategy: FacetStrategy = new FacetStrategy()
  ) { }

  /**
   * Orchestrates the full search lifecycle: filtering, text search, sorting, and facet generation.
   * 
   * @param query - The search query and filters.
   * @param products - The full catalog of products.
   * @returns A search response with results, metadata, and facets.
   */
  search(query: SearchQuery, products: SearchableProduct[]): SearchResponse {
    const startTime = Date.now();

    // Apply filters first
    let filteredProducts = this.filterStrategy.applyFilters(query, products);

    // Perform text search if query text is provided
    let searchResults: SearchResult[] = [];
    if (query.text) {
      searchResults = this.textSearchStrategy.search(query, filteredProducts);
      // Convert search results back to products for further processing
      const searchProductIds = new Set(searchResults.map(r => r.productId.toString()));
      filteredProducts = filteredProducts.filter(p => searchProductIds.has(p.productId.toString()));
    } else {
      // If no text search, create results for all filtered products
      searchResults = filteredProducts.map(product => ({
        productId: product.productId,
        relevanceScore: 1.0,
        matchReasons: ['Filtered result']
      }));
    }

    // Apply sorting
    const sortedResults = this.sortStrategy.sort(searchResults, query, filteredProducts);

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 50;
    const paginatedResults = sortedResults.slice(offset, offset + limit);

    // Generate facets
    const facets = this.facetStrategy.generateFacets(filteredProducts, query);

    const executionTime = Date.now() - startTime;

    return {
      results: paginatedResults,
      totalCount: sortedResults.length,
      facets,
      query,
      executionTime
    };
  }

  /**
   * Generates query suggestions based on partial input and popular query history.
   * Uses prefix matching and fuzzy matching as a fallback.
   */
  suggestQueries(partialQuery: string, popularQueries: string[], maxSuggestions: number = 5): string[] {
    if (!partialQuery.trim()) {
      return popularQueries.slice(0, maxSuggestions);
    }

    const suggestions: string[] = [];
    const queryLower = partialQuery.toLowerCase();

    // Exact prefix matches
    const prefixMatches = popularQueries
      .filter(query => query.toLowerCase().startsWith(queryLower))
      .sort((a, b) => a.length - b.length); // Shorter matches first

    suggestions.push(...prefixMatches.slice(0, maxSuggestions));

    // Fuzzy matches if we don't have enough suggestions
    if (suggestions.length < maxSuggestions) {
      const fuzzyMatches = popularQueries
        .filter(query =>
          !suggestions.includes(query) &&
          (query.toLowerCase().includes(queryLower) ||
            this.levenshteinDistance(query.toLowerCase(), queryLower) <= 2)
        )
        .sort((a, b) => this.levenshteinDistance(a.toLowerCase(), queryLower) -
          this.levenshteinDistance(b.toLowerCase(), queryLower));

      suggestions.push(...fuzzyMatches.slice(0, maxSuggestions - suggestions.length));
    }

    return suggestions.slice(0, maxSuggestions);
  }

  /**
   * Analyzes search result metrics to provide quality insights.
   * 
   * @returns Scores for effectiveness, diversity, and relevance with actionable recommendations.
   */
  analyzeSearchPerformance(searchResponse: SearchResponse): {
    effectiveness: number;
    diversity: number;
    relevance: number;
    recommendations: string[];
  } {
    const { results, facets, executionTime } = searchResponse;

    // Effectiveness: Ratio of results to total available
    const effectiveness = results.length > 0 ? Math.min(results.length / 50, 1) : 0; // Assume max 50 results

    // Diversity: Based on category and price distribution
    const categories = new Set(facets.categories.map(c => c.value));
    const categoryDiversity = categories.size / Math.max(facets.categories.length, 1);

    const priceRanges = facets.priceRanges.filter(r => r.count > 0);
    const priceDiversity = priceRanges.length / facets.priceRanges.length;

    const diversity = (categoryDiversity + priceDiversity) / 2;

    // Relevance: Average relevance score
    const avgRelevance = results.length > 0
      ? results.reduce((sum, r) => sum + r.relevanceScore, 0) / results.length
      : 0;

    const relevance = Math.min(avgRelevance, 1);

    // Generate recommendations
    const recommendations: string[] = [];

    if (effectiveness < 0.5) {
      recommendations.push('Consider broadening search criteria or reducing filters');
    }
    if (diversity < 0.3) {
      recommendations.push('Search results lack diversity - consider adjusting ranking algorithm');
    }
    if (relevance < 0.7) {
      recommendations.push('Low relevance scores - review search algorithm weighting');
    }
    if (executionTime > 100) {
      recommendations.push('Search performance is slow - consider optimization');
    }

    return {
      effectiveness,
      diversity,
      relevance,
      recommendations
    };
  }

  private levenshteinDistance(a: string, b: string): number {
    if (a === b) return 0;
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    let [short, long] = a.length < b.length ? [a, b] : [b, a];
    let prevRow = Array.from({ length: short.length + 1 }, (_, i) => i);
    let currRow = new Array(short.length + 1);

    for (let i = 1; i <= long.length; i++) {
      currRow[0] = i;
      for (let j = 1; j <= short.length; j++) {
        const cost = long[i - 1] === short[j - 1] ? 0 : 1;
        currRow[j] = Math.min(
          prevRow[j] + 1,
          currRow[j - 1] + 1,
          prevRow[j - 1] + cost
        );
      }
      [prevRow, currRow] = [currRow, prevRow];
    }

    return prevRow[short.length];
  }
}
