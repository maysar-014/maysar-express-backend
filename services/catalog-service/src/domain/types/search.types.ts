export interface SearchableProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  salePrice?: number;
  category?: string;
  brand?: string;
  tags?: string[];
  status?: string;
  stock?: number;
  rating?: number;
  type?: string;
  views?: number;
  purchases?: number;
}

export interface SearchQuery {
  text?: string;
  filters?: {
    category?: string;
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
    status?: string;
    inStock?: boolean;
    onSale?: boolean;
    tags?: string[];
  };
  sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'popularity' | 'newest';
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  productId: string;
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

export interface SearchFacets {
  categories: Record<string, number>;
  brands: Record<string, number>;
  priceRanges: Array<{ min: number; max: number; count: number }>;
  ratings: Array<{ rating: number; count: number }>;
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
