/**
 * Product Data Transfer Objects
 * Defines data structures for product-related operations
 * Application layer data contracts
 */

import { ProductType } from '../../domain/value-objects/product-types.value-object';
import { QualityScoreSignals } from '../../domain/value-objects/product-quality-score.value-object';

/**
 * Structured Create Product DTO
 * Input contract for creating a new product with structured attributes
 */
export interface StructuredCreateProductDto {
  sellerId: string;
  categoryId: string;
  brand: string;
  productName: string;
  minimumOrderQuantity: number;
  supplierLocationId?: string;
  supplierLocation?: string;
  structuredAttributes: Record<string, string>;
  mediaUrls: string[];
  price: number;
  currency?: string;
  inventoryCount?: number;
  seoKeywordsOverride?: string[];
  enablerEnabled?: boolean;
  enablerCommissionRate?: number;
  codAccepted?: boolean;
  freeDelivery?: boolean;
  condition?: 'new' | 'used' | 'refurbished' | 'damaged';
}

/**
 * Category Attribute Schema DTO
 * Output contract for category attribute definitions
 */
export interface CategoryAttributeSchemaDto {
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  attributes: Array<{
    id: string;
    name: string;
    displayLabel: string;
    type: 'TEXT' | 'NUMBER' | 'SELECT' | 'BOOLEAN';
    isRequired: boolean;
    options?: string[];
    placeholder?: string;
  }>;
}

/**
 * Generated Description DTO
 * Output contract for preview of generated product description
 */
export interface GeneratedDescriptionDto {
  seoTitle: string;
  shortSeoDescription: string;
  fullDescription: {
    overview: string;
    keyFeatures: string[];
    specifications: Record<string, string>;
    usage: string;
    delivery: string;
    supplierInfo: string;
  };
  qualityScore: number;
  scoreBreakdown: QualityScoreSignals;
  slug: string;
}

/**
 * Create Product DTO
 * Input contract for creating a new product
 */
export interface CreateProductDto {
  sellerId: string;
  name: string;
  description: string;
  price: number;
  currency?: string;
  categoryId: string;
  supplierLocationId?: string;
  supplierLocation?: string;
  type: ProductType;
  tags: string[];
  mediaUrls: string[];
  inventoryCount: number;
  attributes: Record<string, unknown>;
  seoTitle?: string;
  seoDescription?: string;
  enablerEnabled?: boolean;
  enablerCommissionRate?: number;
  codAccepted?: boolean;
  freeDelivery?: boolean;
}

/**
 * Update Product DTO
 * Input contract for updating an existing product
 */
export interface UpdateProductDto {
  productId: string;
  name?: string;
  description?: string;
  price?: number;
  currency?: string;
  categoryId?: string;
  supplierLocation?: string;
  tags?: string[];
  mediaUrls?: string[];
  attributes?: Record<string, unknown>;
  seoTitle?: string;
  seoDescription?: string;
  enablerEnabled?: boolean;
  enablerCommissionRate?: number;
  codAccepted?: boolean;
  freeDelivery?: boolean;
}

/**
 * Campaign promotion info attached to a product in search/listing responses.
 * Present only when the product is covered by an active campaign.
 */
export interface ProductCampaignDto {
  campaignId: string;
  campaignName: string;
  campaignType: string;
  originalPrice: { amount: number; currency: string };
  discountedPrice: { amount: number; currency: string };
  discountPercentage: number;
  discountValue: number;
  ruleType: 'PERCENTAGE_DISCOUNT' | 'FIXED_DISCOUNT' | 'FIXED_PRICE' | 'BUY_GET';
  endsAt: string | null; // ISO 8601 UTC
}

/**
 * Product Summary DTO
 * Compact representation for product listings
 */
export interface ProductSummaryDto {
  id: string;
  name: string;
  description?: string | null;
  price: {
    amount: number;
    currency: string;
  };
  categoryId: string;
  categoryName?: string;
  sellerId: string;
  sellerName?: string;
  supplierLocationId?: string;
  supplierLocation?: string;
  type: string;
  tags: string[];
  status: string;
  thumbnailUrl?: string | null;
  mediaUrls?: string[];
  attributes?: Record<string, unknown> | null;
  averageRating?: number;
  reviewCount?: number;
  inventoryStatus?: 'in_stock' | 'low_stock' | 'out_of_stock';
  inventoryAvailable?: number;
  codAccepted?: boolean;
  freeDelivery?: boolean;
  condition?: 'new' | 'used' | 'refurbished' | 'damaged';
  createdAt: Date;
  slug?: string | null;
  brand?: string | null;
  qualityScore?: number;
  /** First variant details — needed for add-to-cart */
  variantId?: string | null;
  sku?: string | null;
  compareAtPrice?: number | null;
  weight?: number | null;
  /** Present when the product is covered by an active campaign */
  campaign?: ProductCampaignDto | null;
}

/**
 * Product Details DTO
 * Complete representation for product details page
 */
export interface ProductDetailsDto {
  id: string;
  sellerId: string;
  sellerName?: string;
  supplierLocationId?: string;
  supplierLocation?: string;
  name: string;
  description: string;
  price: {
    amount: number;
    currency: string;
    originalPrice?: number;
    discountPercentage?: number;
  };
  categoryId: string;
  categoryName?: string;
  categoryPath?: string[];
  type: string;
  tags: string[];
  attributes: Record<string, unknown>;
  status: string;
  visibility: 'public' | 'private' | 'draft';
  media: Array<{
    id: string;
    url: string;
    type: 'image' | 'video';
    altText?: string;
    order: number;
    isPrimary: boolean;
  }>;
  inventory: {
    available: number;
    reserved: number;
    total: number;
    status: 'in_stock' | 'low_stock' | 'out_of_stock';
    lowStockThreshold?: number;
  };
  shipping: {
    weight?: number;
    dimensions?: {
      length: number;
      width: number;
      height: number;
      unit: string;
    };
    freeShipping: boolean;
    shippingCost?: number;
  };
  seo: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  enabler?: {
    enabled: boolean;
    commissionRate?: number;
  };
  analytics: {
    viewCount: number;
    purchaseCount: number;
    favoriteCount: number;
    shareCount: number;
  };
  ratings: {
    average: number;
    count: number;
    distribution: {
      1: number;
      2: number;
      3: number;
      4: number;
      5: number;
    };
  };
  reviews: Array<{
    id: string;
    userId: string;
    userName: string;
    rating: number;
    title: string;
    content: string;
    verified: boolean;
    helpful: number;
    createdAt: Date;
  }>;
  recommendations: Array<{
    productId: string;
    name: string;
    price: number;
    thumbnailUrl?: string;
    relevanceScore: number;
    reason: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  codAccepted?: boolean;
  freeDelivery?: boolean;
  condition?: 'new' | 'used' | 'refurbished' | 'damaged';
}

/**
 * Product Search DTO
 * Input contract for product search operations
 */
export interface ProductSearchDto {
  query?: string;
  filters: {
    category?: string;
    categories?: string[];
    seller?: string;
    priceRange?: {
      min: number;
      max: number;
    };
    productType?: ProductType;
    tags?: string[];
    inStock?: boolean;
    status?: string;
    rating?: {
      min: number;
      max?: number;
    };
    attributes?: Record<string, unknown>;
    location?: {
      latitude: number;
      longitude: number;
      radius: number; // in kilometers
    };
  };
  sorting: {
    field: 'relevance' | 'price' | 'rating' | 'newest' | 'popularity' | 'distance';
    direction: 'asc' | 'desc';
  };
  pagination: {
    page: number;
    limit: number;
  };
  includeFacets?: boolean;
  includeSuggestions?: boolean;
}



/**
 * Product Inventory DTO
 * Data contract for inventory management operations
 */
export interface ProductInventoryDto {
  productId: string;
  variantId?: string;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  reorderPoint?: number;
  maxStock?: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'discontinued';
  lastUpdated: Date;
  location?: string;
  supplierInfo?: {
    supplierId: string;
    supplierName: string;
    leadTime: number; // in days
    minimumOrder: number;
  };
}

/**
 * Update Inventory DTO
 * Input contract for inventory updates
 */
export interface UpdateInventoryDto {
  productId: string;
  variantId?: string;
  quantity: number;
  operation: 'set' | 'add' | 'subtract' | 'reserve' | 'release';
  reason?: string;
  location?: string;
  reference?: string; // order ID, adjustment ID, etc.
}

/**
 * Product Analytics DTO
 * Data contract for product performance analytics
 */
export interface ProductAnalyticsDto {
  productId: string;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    views: number;
    uniqueViews: number;
    addToCart: number;
    purchases: number;
    conversionRate: number;
    averageOrderValue: number;
    revenue: number;
    profit: number;
    margin: number;
  };
  trends: {
    views: Array<{ date: string; count: number }>;
    purchases: Array<{ date: string; count: number }>;
    revenue: Array<{ date: string; amount: number }>;
  };
  demographics: {
    ageGroups: Record<string, number>;
    genders: Record<string, number>;
    locations: Record<string, number>;
    devices: Record<string, number>;
  };
  sources: {
    direct: number;
    search: number;
    social: number;
    email: number;
    referral: number;
  };
}

/**
 * Product Validation DTO
 * Data contract for product validation results
 */
export interface ProductValidationDto {
  isValid: boolean;
  errors: Array<{
    field: string;
    code: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
  }>;
  warnings: Array<{
    field: string;
    code: string;
    message: string;
  }>;
  suggestions: Array<{
    field: string;
    type: 'improvement' | 'optimization' | 'compliance';
    message: string;
    impact: 'low' | 'medium' | 'high';
  }>;
}
