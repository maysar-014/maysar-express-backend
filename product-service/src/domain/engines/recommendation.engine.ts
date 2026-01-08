export interface RecommendationInput {
  customerId?: string;
  context: RecommendationContext;
  productIds?: string[];
  preferences?: CustomerPreferences;
  requestType: 'product_page' | 'cart' | 'checkout' | 'homepage' | 'search' | 'email';
  maxRecommendations?: number;
  filters?: RecommendationFilters;
}

export interface RecommendationContext {
  sessionId?: string;
  currentProductId?: string;
  cartItems?: CartItem[];
  browsedProducts?: string[];
  searchQuery?: string;
  category?: string;
  priceRange?: PriceRange;
  region?: string;
  channel: 'web' | 'mobile' | 'api' | 'email';
  timestamp: Date;
}

export interface CustomerPreferences {
  categories: string[];
  brands: string[];
  priceRange: PriceRange;
  features: string[];
  excludeCategories?: string[];
  excludeBrands?: string[];
}

export interface CartItem {
  productId: string;
  variantId?: string;
  quantity: number;
  price: number;
  category: string;
}

export interface PriceRange {
  min: number;
  max: number;
  currency: string;
}

export interface RecommendationFilters {
  categories?: string[];
  brands?: string[];
  priceRange?: PriceRange;
  inStock?: boolean;
  minRating?: number;
  excludeProducts?: string[];
}

export interface RecommendationOutput {
  success: boolean;
  recommendations: ProductRecommendation[];
  crossSelling: CrossSellingRecommendation[];
  upselling: UpsellingRecommendation[];
  alternatives: AlternativeRecommendation[];
  personalized: PersonalizedOffer[];
  confidence: number;
  processingTime: number;
  reasoning: RecommendationReasoning;
  warnings: string[];
  recommendations_metadata: RecommendationMetadata;
}

export interface ProductRecommendation {
  productId: string;
  variantId?: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  originalPrice?: number;
  currency: string;
  rating: number;
  reviewCount: number;
  imageUrl: string;
  inStock: boolean;
  score: number;
  reasons: string[];
  tags: string[];
}

export interface CrossSellingRecommendation {
  productId: string;
  name: string;
  category: string;
  price: number;
  currency: string;
  score: number;
  compatibility: number;
  bundleDiscount?: number;
  reasons: string[];
}

export interface UpsellingRecommendation {
  productId: string;
  name: string;
  category: string;
  price: number;
  currency: string;
  priceIncrease: number;
  valueProposition: string;
  features: string[];
  score: number;
  reasons: string[];
}

export interface AlternativeRecommendation {
  productId: string;
  name: string;
  category: string;
  price: number;
  currency: string;
  similarity: number;
  priceComparison: 'lower' | 'similar' | 'higher';
  advantages: string[];
  score: number;
  reasons: string[];
}

export interface PersonalizedOffer {
  offerId: string;
  type: 'discount' | 'bundle' | 'free_shipping' | 'loyalty_points';
  productIds: string[];
  discount: number;
  description: string;
  validUntil: Date;
  conditions: string[];
  score: number;
}

export interface RecommendationReasoning {
  primaryStrategy: string;
  factors: RecommendationFactor[];
  modelUsed: string;
  dataPoints: number;
  confidence: number;
}

export interface RecommendationFactor {
  factor: string;
  weight: number;
  impact: 'high' | 'medium' | 'low';
  description: string;
}

export interface RecommendationMetadata {
  totalProducts: number;
  filteredProducts: number;
  processingSteps: string[];
  cacheHit: boolean;
  modelVersion: string;
  abTestGroup?: string;
}

export interface RecommendationModel {
  modelId: string;
  type: 'collaborative' | 'content_based' | 'hybrid' | 'deep_learning';
  accuracy: number;
  lastTrained: Date;
  features: string[];
  performance: ModelPerformance;
}

export interface ModelPerformance {
  precision: number;
  recall: number;
  f1Score: number;
  clickThroughRate: number;
  conversionRate: number;
  revenueImpact: number;
}

export class RecommendationEngine {
  private readonly ACCURACY_TARGET = 95.0;
  private readonly MAX_PROCESSING_TIME = 30; // ms
  private readonly DEFAULT_MAX_RECOMMENDATIONS = 10;
  
  private readonly CONFIDENCE_WEIGHTS = {
    modelAccuracy: 0.30,
    dataQuality: 0.25,
    userBehavior: 0.20,
    productSimilarity: 0.15,
    systemReliability: 0.10
  };

  private models: Map<string, RecommendationModel> = new Map();

  constructor() {
    this.initializeModels();
  }

  async generateRecommendations(input: RecommendationInput): Promise<RecommendationOutput> {
    const startTime = Date.now();
    
    try {
      // Input validation
      const validationResult = await this.validateInput(input);
      if (!validationResult.valid) {
        throw new Error(`Recommendation validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Get customer profile and behavior data
      const [
        customerProfile,
        behaviorData,
        productCatalog,
        marketData
      ] = await Promise.all([
        this.getCustomerProfile(input.customerId),
        this.getBehaviorData(input.customerId, input.context),
        this.getProductCatalog(input.filters),
        this.getMarketData(input.context.category)
      ]);

      // Select optimal recommendation model
      const model = this.selectModel(input, customerProfile, behaviorData);

      // Generate different types of recommendations
      const [
        productRecommendations,
        crossSellingRecommendations,
        upsellingRecommendations,
        alternativeRecommendations,
        personalizedOffers
      ] = await Promise.all([
        this.generateProductRecommendations(input, model, customerProfile, productCatalog),
        this.generateCrossSelling(input, model, customerProfile, productCatalog),
        this.generateUpselling(input, model, customerProfile, productCatalog),
        this.generateAlternatives(input, model, customerProfile, productCatalog),
        this.generatePersonalizedOffers(input, customerProfile, marketData)
      ]);

      // Calculate confidence and reasoning
      const confidence = this.calculateConfidence(
        model,
        customerProfile,
        behaviorData,
        productRecommendations
      );

      const reasoning = this.generateReasoning(
        model,
        customerProfile,
        behaviorData,
        input
      );

      const processingTime = Date.now() - startTime;

      // Generate metadata
      const metadata: RecommendationMetadata = {
        totalProducts: productCatalog.length,
        filteredProducts: productRecommendations.length,
        processingSteps: ['validation', 'profiling', 'modeling', 'ranking', 'filtering'],
        cacheHit: false,
        modelVersion: model.modelId,
        abTestGroup: this.getABTestGroup(input.customerId)
      };

      // Generate insights
      const warnings = await this.generateWarnings(
        productRecommendations,
        customerProfile,
        input
      );

      return {
        success: true,
        recommendations: productRecommendations,
        crossSelling: crossSellingRecommendations,
        upselling: upsellingRecommendations,
        alternatives: alternativeRecommendations,
        personalized: personalizedOffers,
        confidence,
        processingTime,
        reasoning,
        warnings,
        recommendations_metadata: metadata
      };

    } catch (error: any) {
      return {
        success: false,
        recommendations: [],
        crossSelling: [],
        upselling: [],
        alternatives: [],
        personalized: [],
        confidence: 0,
        processingTime: Date.now() - startTime,
        reasoning: {
          primaryStrategy: 'error',
          factors: [],
          modelUsed: 'none',
          dataPoints: 0,
          confidence: 0
        },
        warnings: [error.message],
        recommendations_metadata: {
          totalProducts: 0,
          filteredProducts: 0,
          processingSteps: ['error'],
          cacheHit: false,
          modelVersion: 'none'
        }
      };
    }
  }

  private async validateInput(input: RecommendationInput): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!input.context) errors.push('Context required');
    if (!input.requestType) errors.push('Request type required');
    if (!input.context.channel) errors.push('Channel required');
    if (!input.context.timestamp) errors.push('Timestamp required');

    const validRequestTypes = ['product_page', 'cart', 'checkout', 'homepage', 'search', 'email'];
    if (!validRequestTypes.includes(input.requestType)) {
      errors.push('Invalid request type');
    }

    return { valid: errors.length === 0, errors };
  }

  private async getCustomerProfile(customerId?: string): Promise<any> {
    if (!customerId) {
      return {
        isAnonymous: true,
        preferences: { categories: [], brands: [], priceRange: { min: 0, max: 1000000, currency: 'TZS' } },
        behavior: { purchaseHistory: [], viewHistory: [], searchHistory: [] },
        demographics: { age: null, gender: null, location: null }
      };
    }

    // Simulate customer profile retrieval
    return {
      customerId,
      isAnonymous: false,
      preferences: {
        categories: ['electronics', 'fashion'],
        brands: ['Samsung', 'Apple', 'Nike'],
        priceRange: { min: 10000, max: 500000, currency: 'TZS' }
      },
      behavior: {
        purchaseHistory: ['prod_electronics_001', 'prod_fashion_002'],
        viewHistory: ['prod_electronics_003', 'prod_accessories_001'],
        searchHistory: ['smartphone', 'headphones', 'shoes']
      },
      demographics: {
        age: 28,
        gender: 'male',
        location: 'dar_es_salaam'
      },
      loyaltyTier: 'gold',
      totalSpent: 450000,
      averageOrderValue: 75000
    };
  }

  private async getBehaviorData(customerId?: string, context?: RecommendationContext): Promise<any> {
    return {
      sessionViews: context?.browsedProducts || [],
      currentCategory: context?.category,
      searchQuery: context?.searchQuery,
      cartValue: context?.cartItems?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0,
      timeOnSite: 450, // seconds
      pageViews: 8,
      clickPattern: 'explorer' // explorer, focused, comparison_shopper
    };
  }

  private async getProductCatalog(filters?: RecommendationFilters): Promise<any[]> {
    // Simulate product catalog with filtering
    const products = [
      {
        productId: 'prod_electronics_001',
        name: 'Samsung Galaxy S24',
        category: 'electronics',
        brand: 'Samsung',
        price: 850000,
        originalPrice: 950000,
        currency: 'TZS',
        rating: 4.5,
        reviewCount: 234,
        imageUrl: '/images/samsung-s24.jpg',
        inStock: true,
        features: ['5G', '128GB', 'Triple Camera'],
        tags: ['smartphone', 'android', 'premium']
      },
      {
        productId: 'prod_electronics_002',
        name: 'iPhone 15',
        category: 'electronics',
        brand: 'Apple',
        price: 1200000,
        currency: 'TZS',
        rating: 4.7,
        reviewCount: 456,
        imageUrl: '/images/iphone-15.jpg',
        inStock: true,
        features: ['iOS', '256GB', 'Pro Camera'],
        tags: ['smartphone', 'ios', 'premium']
      },
      {
        productId: 'prod_accessories_001',
        name: 'Wireless Earbuds Pro',
        category: 'accessories',
        brand: 'Sony',
        price: 180000,
        currency: 'TZS',
        rating: 4.3,
        reviewCount: 189,
        imageUrl: '/images/earbuds-pro.jpg',
        inStock: true,
        features: ['Noise Cancelling', 'Wireless', '24h Battery'],
        tags: ['audio', 'wireless', 'premium']
      },
      {
        productId: 'prod_fashion_001',
        name: 'Nike Air Max 270',
        category: 'fashion',
        brand: 'Nike',
        price: 220000,
        currency: 'TZS',
        rating: 4.4,
        reviewCount: 312,
        imageUrl: '/images/nike-air-max.jpg',
        inStock: true,
        features: ['Air Cushioning', 'Breathable', 'Durable'],
        tags: ['shoes', 'sports', 'casual']
      }
    ];

    // Apply filters
    let filteredProducts = products;

    if (filters?.categories) {
      filteredProducts = filteredProducts.filter(p => filters.categories!.includes(p.category));
    }

    if (filters?.priceRange) {
      filteredProducts = filteredProducts.filter(p => 
        p.price >= filters.priceRange!.min && p.price <= filters.priceRange!.max
      );
    }

    if (filters?.inStock) {
      filteredProducts = filteredProducts.filter(p => p.inStock);
    }

    if (filters?.minRating) {
      filteredProducts = filteredProducts.filter(p => p.rating >= filters.minRating!);
    }

    return filteredProducts;
  }

  private async getMarketData(category?: string): Promise<any> {
    return {
      trendingProducts: ['prod_electronics_001', 'prod_fashion_001'],
      seasonalFactors: { electronics: 1.2, fashion: 0.9 },
      competitorPrices: { 'prod_electronics_001': 820000 },
      demandLevel: 'high',
      inventoryLevels: { 'prod_electronics_001': 45 }
    };
  }

  private selectModel(input: RecommendationInput, customerProfile: any, behaviorData: any): RecommendationModel {
    // Select model based on context and data availability
    if (customerProfile.isAnonymous) {
      return this.models.get('content_based') || this.models.get('hybrid')!;
    }

    if (input.requestType === 'cart' || input.requestType === 'checkout') {
      return this.models.get('cross_selling') || this.models.get('hybrid')!;
    }

    return this.models.get('hybrid')!;
  }

  private async generateProductRecommendations(
    input: RecommendationInput,
    model: RecommendationModel,
    customerProfile: any,
    productCatalog: any[]
  ): Promise<ProductRecommendation[]> {
    const maxRecommendations = input.maxRecommendations || this.DEFAULT_MAX_RECOMMENDATIONS;
    
    // Score products based on multiple factors
    const scoredProducts = productCatalog.map(product => {
      let score = 0;
      const reasons: string[] = [];

      // Category preference
      if (customerProfile.preferences.categories.includes(product.category)) {
        score += 0.3;
        reasons.push('Matches your category preferences');
      }

      // Brand preference
      if (customerProfile.preferences.brands.includes(product.brand)) {
        score += 0.2;
        reasons.push('From your preferred brands');
      }

      // Price range
      if (product.price >= customerProfile.preferences.priceRange.min && 
          product.price <= customerProfile.preferences.priceRange.max) {
        score += 0.2;
        reasons.push('Within your price range');
      }

      // Rating boost
      score += (product.rating / 5) * 0.15;
      if (product.rating >= 4.5) {
        reasons.push('Highly rated product');
      }

      // Stock availability
      if (product.inStock) {
        score += 0.1;
      } else {
        score *= 0.5; // Heavily penalize out of stock
      }

      // Trending boost
      if (input.context.category === product.category) {
        score += 0.05;
        reasons.push('Popular in this category');
      }

      return {
        ...product,
        score: Math.min(score, 1.0),
        reasons: reasons.length > 0 ? reasons : ['Recommended for you']
      };
    });

    // Sort by score and take top recommendations
    return scoredProducts
      .sort((a, b) => b.score - a.score)
      .slice(0, maxRecommendations)
      .map(product => ({
        productId: product.productId,
        variantId: product.variantId,
        name: product.name,
        category: product.category,
        brand: product.brand,
        price: product.price,
        originalPrice: product.originalPrice,
        currency: product.currency,
        rating: product.rating,
        reviewCount: product.reviewCount,
        imageUrl: product.imageUrl,
        inStock: product.inStock,
        score: product.score,
        reasons: product.reasons,
        tags: product.tags
      }));
  }

  private async generateCrossSelling(
    input: RecommendationInput,
    model: RecommendationModel,
    customerProfile: any,
    productCatalog: any[]
  ): Promise<CrossSellingRecommendation[]> {
    if (!input.context.cartItems || input.context.cartItems.length === 0) {
      return [];
    }

    const cartCategories = input.context.cartItems.map(item => item.category);
    const complementaryProducts = productCatalog.filter(product => {
      // Find products that complement cart items
      if (cartCategories.includes('electronics') && product.category === 'accessories') return true;
      if (cartCategories.includes('fashion') && product.category === 'accessories') return true;
      return false;
    });

    return complementaryProducts.slice(0, 3).map(product => ({
      productId: product.productId,
      name: product.name,
      category: product.category,
      price: product.price,
      currency: product.currency,
      score: 0.85,
      compatibility: 0.9,
      bundleDiscount: 0.1,
      reasons: ['Frequently bought together', 'Complements your cart items']
    }));
  }

  private async generateUpselling(
    input: RecommendationInput,
    model: RecommendationModel,
    customerProfile: any,
    productCatalog: any[]
  ): Promise<UpsellingRecommendation[]> {
    if (!input.context.currentProductId) {
      return [];
    }

    const currentProduct = productCatalog.find(p => p.productId === input.context.currentProductId);
    if (!currentProduct) return [];

    const upsellingProducts = productCatalog.filter(product => 
      product.category === currentProduct.category &&
      product.price > currentProduct.price &&
      product.price <= currentProduct.price * 1.5
    );

    return upsellingProducts.slice(0, 2).map(product => ({
      productId: product.productId,
      name: product.name,
      category: product.category,
      price: product.price,
      currency: product.currency,
      priceIncrease: product.price - currentProduct.price,
      valueProposition: 'Premium features and better performance',
      features: product.features || [],
      score: 0.8,
      reasons: ['Better features', 'Higher quality', 'More value']
    }));
  }

  private async generateAlternatives(
    input: RecommendationInput,
    model: RecommendationModel,
    customerProfile: any,
    productCatalog: any[]
  ): Promise<AlternativeRecommendation[]> {
    if (!input.context.currentProductId) {
      return [];
    }

    const currentProduct = productCatalog.find(p => p.productId === input.context.currentProductId);
    if (!currentProduct) return [];

    const alternatives = productCatalog.filter(product => 
      product.category === currentProduct.category &&
      product.productId !== currentProduct.productId
    );

    return alternatives.slice(0, 3).map(product => {
      const priceComparison = product.price < currentProduct.price ? 'lower' : 
                             product.price > currentProduct.price ? 'higher' : 'similar';
      
      return {
        productId: product.productId,
        name: product.name,
        category: product.category,
        price: product.price,
        currency: product.currency,
        similarity: 0.85,
        priceComparison: priceComparison as 'lower' | 'similar' | 'higher',
        advantages: priceComparison === 'lower' ? ['More affordable'] : ['Premium features'],
        score: 0.75,
        reasons: ['Similar product', 'Good alternative']
      };
    });
  }

  private async generatePersonalizedOffers(
    input: RecommendationInput,
    customerProfile: any,
    marketData: any
  ): Promise<PersonalizedOffer[]> {
    const offers: PersonalizedOffer[] = [];

    // Loyalty tier based offers
    if (customerProfile.loyaltyTier === 'gold') {
      offers.push({
        offerId: `offer_${Date.now()}_loyalty`,
        type: 'discount',
        productIds: ['prod_electronics_001'],
        discount: 0.1,
        description: 'Gold member 10% discount',
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        conditions: ['Gold membership required'],
        score: 0.9
      });
    }

    // Cart value based offers
    const cartValue = input.context.cartItems?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0;
    if (cartValue > 100000) {
      offers.push({
        offerId: `offer_${Date.now()}_shipping`,
        type: 'free_shipping',
        productIds: [],
        discount: 0,
        description: 'Free shipping on orders over 100,000 TZS',
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
        conditions: ['Minimum order value 100,000 TZS'],
        score: 0.8
      });
    }

    return offers;
  }

  private calculateConfidence(
    model: RecommendationModel,
    customerProfile: any,
    behaviorData: any,
    recommendations: ProductRecommendation[]
  ): number {
    const factors = {
      modelAccuracy: model.accuracy,
      dataQuality: customerProfile.isAnonymous ? 0.6 : 0.9,
      userBehavior: behaviorData.sessionViews.length > 0 ? 0.8 : 0.5,
      productSimilarity: recommendations.length > 0 ? 0.85 : 0.3,
      systemReliability: 0.95
    };

    const confidence = Object.entries(factors).reduce((total, [key, value]) => {
      return total + (value * (this.CONFIDENCE_WEIGHTS as any)[key]);
    }, 0) * 100;

    return Math.min(confidence, 99.9);
  }

  private generateReasoning(
    model: RecommendationModel,
    customerProfile: any,
    behaviorData: any,
    input: RecommendationInput
  ): RecommendationReasoning {
    const factors: RecommendationFactor[] = [
      {
        factor: 'customer_preferences',
        weight: 0.3,
        impact: 'high',
        description: 'Based on your category and brand preferences'
      },
      {
        factor: 'browsing_behavior',
        weight: 0.25,
        impact: 'medium',
        description: 'Influenced by your recent browsing activity'
      },
      {
        factor: 'product_popularity',
        weight: 0.2,
        impact: 'medium',
        description: 'Trending and highly-rated products'
      },
      {
        factor: 'price_compatibility',
        weight: 0.15,
        impact: 'low',
        description: 'Products within your typical price range'
      },
      {
        factor: 'inventory_availability',
        weight: 0.1,
        impact: 'low',
        description: 'Currently available products prioritized'
      }
    ];

    return {
      primaryStrategy: customerProfile.isAnonymous ? 'content_based' : 'hybrid',
      factors,
      modelUsed: model.modelId,
      dataPoints: customerProfile.behavior?.purchaseHistory?.length || 0,
      confidence: model.accuracy
    };
  }

  private async generateWarnings(
    recommendations: ProductRecommendation[],
    customerProfile: any,
    input: RecommendationInput
  ): Promise<string[]> {
    const warnings: string[] = [];

    if (recommendations.length === 0) {
      warnings.push('No recommendations generated - insufficient data or strict filters');
    }

    if (customerProfile.isAnonymous) {
      warnings.push('Limited personalization for anonymous users');
    }

    const outOfStockCount = recommendations.filter(r => !r.inStock).length;
    if (outOfStockCount > 0) {
      warnings.push(`${outOfStockCount} recommended products are out of stock`);
    }

    return warnings;
  }

  private getABTestGroup(customerId?: string): string {
    if (!customerId) return 'control';
    
    // Simple hash-based A/B test assignment
    const hash = customerId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return hash % 2 === 0 ? 'variant_a' : 'variant_b';
  }

  private initializeModels(): void {
    this.models.set('collaborative', {
      modelId: 'collaborative_v1.2',
      type: 'collaborative',
      accuracy: 0.87,
      lastTrained: new Date('2024-01-15'),
      features: ['user_similarity', 'item_similarity', 'rating_matrix'],
      performance: {
        precision: 0.82,
        recall: 0.79,
        f1Score: 0.80,
        clickThroughRate: 0.15,
        conversionRate: 0.08,
        revenueImpact: 0.12
      }
    });

    this.models.set('content_based', {
      modelId: 'content_based_v2.1',
      type: 'content_based',
      accuracy: 0.83,
      lastTrained: new Date('2024-01-20'),
      features: ['product_features', 'category_similarity', 'brand_affinity'],
      performance: {
        precision: 0.85,
        recall: 0.75,
        f1Score: 0.79,
        clickThroughRate: 0.12,
        conversionRate: 0.06,
        revenueImpact: 0.09
      }
    });

    this.models.set('hybrid', {
      modelId: 'hybrid_v3.0',
      type: 'hybrid',
      accuracy: 0.91,
      lastTrained: new Date('2024-01-25'),
      features: ['collaborative_signals', 'content_features', 'behavioral_data', 'contextual_info'],
      performance: {
        precision: 0.88,
        recall: 0.84,
        f1Score: 0.86,
        clickThroughRate: 0.18,
        conversionRate: 0.11,
        revenueImpact: 0.16
      }
    });

    this.models.set('cross_selling', {
      modelId: 'cross_selling_v1.5',
      type: 'content_based',
      accuracy: 0.89,
      lastTrained: new Date('2024-01-22'),
      features: ['product_associations', 'cart_analysis', 'purchase_patterns'],
      performance: {
        precision: 0.86,
        recall: 0.81,
        f1Score: 0.83,
        clickThroughRate: 0.16,
        conversionRate: 0.09,
        revenueImpact: 0.14
      }
    });
  }
}