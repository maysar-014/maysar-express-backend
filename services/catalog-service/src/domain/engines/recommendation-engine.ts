/**
 * Recommendation Engine
 * Domain engine for product recommendation and personalization
 * Pure business logic - no side effects or external dependencies
 */

import { ProductId, SellerId } from '../value-objects/ids.value-object';
import { Price } from '../value-objects/monetary.value-object';
import { ProductType } from '../value-objects/product-types.value-object';

export interface UserProfile {
  userId: string;
  preferences: {
    categories: string[];
    priceRange: { min: number; max: number };
    brands: string[];
    productTypes: ProductType[];
  };
  behaviorHistory: {
    viewedProducts: ProductId[];
    purchasedProducts: ProductId[];
    cartAdditions: ProductId[];
    searchQueries: string[];
    categoriesBrowsed: string[];
  };
  demographics?: {
    ageGroup?: string;
    location?: string;
    deviceType?: 'mobile' | 'desktop' | 'tablet';
  };
}

export interface ProductFeatures {
  productId: ProductId;
  sellerId: SellerId;
  category: string;
  price: Price;
  type: ProductType;
  tags: string[];
  averageRating: number;
  reviewCount: number;
  popularityScore: number;
  seasonalityFactor: number;
  complementaryProducts: ProductId[];
  substituteProducts: ProductId[];
}

export interface RecommendationContext {
  userProfile?: UserProfile;
  currentProduct?: ProductId;
  category?: string;
  searchQuery?: string;
  occasion?: 'birthday' | 'anniversary' | 'holiday' | 'regular';
  maxRecommendations: number;
  includeViewedProducts: boolean;
}

export interface RecommendationResult {
  productId: ProductId;
  score: number;
  reason: string;
  confidence: number;
  strategy: string;
}

export class CollaborativeFilteringStrategy {
  recommend(context: RecommendationContext, availableProducts: ProductFeatures[]): RecommendationResult[] {
    if (!context.userProfile) {
      return [];
    }

    const userProfile = context.userProfile;
    const recommendations: RecommendationResult[] = [];

    for (const product of availableProducts) {
      let score = 0;
      const reasons: string[] = [];

      // Purchase history similarity
      if (userProfile.behaviorHistory.purchasedProducts.length > 0) {
        const similarPurchases = this.findSimilarProducts(
          product.productId,
          userProfile.behaviorHistory.purchasedProducts,
          availableProducts
        );

        if (similarPurchases.length > 0) {
          score += 0.4;
          reasons.push('Similar to previously purchased items');
        }
      }

      // View history analysis
      if (userProfile.behaviorHistory.viewedProducts.length > 0) {
        const viewedSimilar = this.findSimilarProducts(
          product.productId,
          userProfile.behaviorHistory.viewedProducts,
          availableProducts
        );

        if (viewedSimilar.length > 0) {
          score += 0.3;
          reasons.push('Similar to items you viewed');
        }
      }

      // Category preferences
      if (userProfile.preferences.categories.includes(product.category)) {
        score += 0.2;
        reasons.push('Matches your preferred categories');
      }

      // Price range compatibility
      const productPrice = product.price.toNumber();
      if (productPrice >= userProfile.preferences.priceRange.min &&
          productPrice <= userProfile.preferences.priceRange.max) {
        score += 0.1;
        reasons.push('Within your preferred price range');
      }

      if (score > 0) {
        recommendations.push({
          productId: product.productId,
          score,
          reason: reasons.join(', '),
          confidence: Math.min(score + 0.2, 1.0),
          strategy: 'collaborative_filtering'
        });
      }
    }

    return recommendations.sort((a, b) => b.score - a.score);
  }

  private findSimilarProducts(
    targetProduct: ProductId,
    userHistory: ProductId[],
    allProducts: ProductFeatures[]
  ): ProductFeatures[] {
    const targetProductData = allProducts.find(p => p.productId.toString() === targetProduct.toString());
    if (!targetProductData) return [];

    return allProducts.filter(product => {
      // Simple similarity based on category and price range
      const categoryMatch = product.category === targetProductData.category;
      const priceDiff = Math.abs(product.price.toNumber() - targetProductData.price.toNumber());
      const priceSimilarity = priceDiff / Math.max(product.price.toNumber(), targetProductData.price.toNumber());

      return categoryMatch && priceSimilarity < 0.3; // Within 30% price difference
    });
  }
}

export class ContentBasedStrategy {
  recommend(context: RecommendationContext, availableProducts: ProductFeatures[]): RecommendationResult[] {
    if (!context.currentProduct) {
      return [];
    }

    const currentProductData = availableProducts.find(p => p.productId.toString() === context.currentProduct!.toString());
    if (!currentProductData) return [];

    const recommendations: RecommendationResult[] = [];

    for (const product of availableProducts) {
      if (product.productId.toString() === context.currentProduct!.toString()) continue;

      let score = 0;
      const reasons: string[] = [];

      // Category similarity
      if (product.category === currentProductData.category) {
        score += 0.3;
        reasons.push('Same category');
      }

      // Price similarity
      const priceDiff = Math.abs(product.price.toNumber() - currentProductData.price.toNumber());
      const priceSimilarity = 1 - (priceDiff / Math.max(product.price.toNumber(), currentProductData.price.toNumber()));

      if (priceSimilarity > 0.7) {
        score += 0.25 * priceSimilarity;
        reasons.push('Similar price range');
      }

      // Tag similarity
      const commonTags = product.tags.filter(tag => currentProductData.tags.includes(tag));
      if (commonTags.length > 0) {
        score += 0.2 * (commonTags.length / Math.max(product.tags.length, currentProductData.tags.length));
        reasons.push(`Shares ${commonTags.length} common tags`);
      }

      // Complementary products
      if (currentProductData.complementaryProducts.some(id => id.toString() === product.productId.toString())) {
        score += 0.4;
        reasons.push('Frequently bought together');
      }

      if (score > 0.2) { // Minimum threshold
        recommendations.push({
          productId: product.productId,
          score,
          reason: reasons.join(', '),
          confidence: Math.min(score + 0.1, 0.95),
          strategy: 'content_based'
        });
      }
    }

    return recommendations.sort((a, b) => b.score - a.score);
  }
}

export class PopularityBasedStrategy {
  recommend(context: RecommendationContext, availableProducts: ProductFeatures[]): RecommendationResult[] {
    const recommendations: RecommendationResult[] = [];

    // Sort by popularity score and recency factors
    const sortedProducts = availableProducts
      .filter(product => {
        // Filter out viewed products if requested
        if (!context.includeViewedProducts && context.userProfile) {
          return !context.userProfile.behaviorHistory.viewedProducts
            .some(viewedId => viewedId.toString() === product.productId.toString());
        }
        return true;
      })
      .sort((a, b) => {
        // Composite score: popularity + rating + review count
        const scoreA = a.popularityScore + (a.averageRating * 0.2) + (Math.log(a.reviewCount + 1) * 0.1);
        const scoreB = b.popularityScore + (b.averageRating * 0.2) + (Math.log(b.reviewCount + 1) * 0.1);
        return scoreB - scoreA;
      });

    for (const product of sortedProducts.slice(0, context.maxRecommendations)) {
      recommendations.push({
        productId: product.productId,
        score: product.popularityScore,
        reason: `Popular item with ${product.reviewCount} reviews and ${product.averageRating} rating`,
        confidence: 0.8,
        strategy: 'popularity_based'
      });
    }

    return recommendations;
  }
}

export class SeasonalStrategy {
  recommend(context: RecommendationContext, availableProducts: ProductFeatures[]): RecommendationResult[] {
    const recommendations: RecommendationResult[] = [];
    const currentMonth = new Date().getMonth() + 1; // 1-12

    // Seasonal relevance based on month
    const seasonalProducts = availableProducts
      .filter(product => product.seasonalityFactor > 1.0)
      .sort((a, b) => b.seasonalityFactor - a.seasonalityFactor);

    for (const product of seasonalProducts.slice(0, Math.min(5, context.maxRecommendations))) {
      const seasonalBoost = product.seasonalityFactor;
      recommendations.push({
        productId: product.productId,
        score: seasonalBoost,
        reason: `Seasonally relevant for ${this.getSeasonName(currentMonth)}`,
        confidence: Math.min(seasonalBoost * 0.1, 0.9),
        strategy: 'seasonal'
      });
    }

    return recommendations;
  }

  private getSeasonName(month: number): string {
    if (month >= 12 || month <= 2) return 'winter';
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    return 'fall';
  }
}

export class RecommendationEngine {
  constructor(
    private readonly strategies: Array<{
      strategy: any;
      weight: number;
      enabled: boolean;
    }> = [
      { strategy: new CollaborativeFilteringStrategy(), weight: 0.4, enabled: true },
      { strategy: new ContentBasedStrategy(), weight: 0.3, enabled: true },
      { strategy: new PopularityBasedStrategy(), weight: 0.2, enabled: true },
      { strategy: new SeasonalStrategy(), weight: 0.1, enabled: true }
    ]
  ) {}

  generateRecommendations(
    context: RecommendationContext,
    availableProducts: ProductFeatures[]
  ): RecommendationResult[] {
    const allRecommendations: RecommendationResult[] = [];

    // Execute each enabled strategy
    for (const { strategy, weight, enabled } of this.strategies) {
      if (!enabled) continue;

      try {
        const strategyResults = strategy.recommend(context, availableProducts);

        // Apply strategy weight to scores
        const weightedResults = strategyResults.map((result: RecommendationResult) => ({
          ...result,
          score: result.score * weight,
          confidence: result.confidence * weight
        }));

        allRecommendations.push(...weightedResults);
      } catch (error) {
        // Strategy failure shouldn't break recommendations
        console.warn(`Recommendation strategy failed:`, error);
      }
    }

    // Aggregate and deduplicate recommendations
    const aggregatedResults = this.aggregateRecommendations(allRecommendations);

    // Sort by final score and limit results
    return aggregatedResults
      .sort((a, b) => b.score - a.score)
      .slice(0, context.maxRecommendations);
  }

  generateComplementaryProducts(
    productId: ProductId,
    availableProducts: ProductFeatures[],
    maxRecommendations: number = 5
  ): RecommendationResult[] {
    const productData = availableProducts.find(p => p.productId.toString() === productId.toString());
    if (!productData) return [];

    const recommendations: RecommendationResult[] = [];

    // Find complementary products
    for (const complementaryId of productData.complementaryProducts) {
      const complementaryProduct = availableProducts.find(p => p.productId.toString() === complementaryId.toString());
      if (complementaryProduct) {
        recommendations.push({
          productId: complementaryProduct.productId,
          score: 0.9,
          reason: 'Frequently bought together',
          confidence: 0.85,
          strategy: 'complementary'
        });
      }
    }

    return recommendations.slice(0, maxRecommendations);
  }

  generateSubstituteProducts(
    productId: ProductId,
    availableProducts: ProductFeatures[],
    maxRecommendations: number = 3
  ): RecommendationResult[] {
    const productData = availableProducts.find(p => p.productId.toString() === productId.toString());
    if (!productData) return [];

    const recommendations: RecommendationResult[] = [];

    // Find substitute products
    for (const substituteId of productData.substituteProducts) {
      const substituteProduct = availableProducts.find(p => p.productId.toString() === substituteId.toString());
      if (substituteProduct) {
        recommendations.push({
          productId: substituteProduct.productId,
          score: 0.7,
          reason: 'Similar alternative product',
          confidence: 0.75,
          strategy: 'substitute'
        });
      }
    }

    return recommendations.slice(0, maxRecommendations);
  }

  analyzeRecommendationDiversity(recommendations: RecommendationResult[]): {
    categoryDiversity: number;
    priceDiversity: number;
    typeDiversity: number;
    overallDiversity: number;
  } {
    if (recommendations.length === 0) {
      return { categoryDiversity: 0, priceDiversity: 0, typeDiversity: 0, overallDiversity: 0 };
    }

    // This would require product metadata - simplified implementation
    const categories = new Set(recommendations.map(r => 'category_' + Math.floor(Math.random() * 5)));
    const priceRanges = new Set(recommendations.map(r => Math.floor(r.score * 10)));
    const types = new Set(recommendations.map(r => 'type_' + Math.floor(Math.random() * 3)));

    const categoryDiversity = categories.size / recommendations.length;
    const priceDiversity = priceRanges.size / recommendations.length;
    const typeDiversity = types.size / recommendations.length;
    const overallDiversity = (categoryDiversity + priceDiversity + typeDiversity) / 3;

    return {
      categoryDiversity,
      priceDiversity,
      typeDiversity,
      overallDiversity
    };
  }

  private aggregateRecommendations(recommendations: RecommendationResult[]): RecommendationResult[] {
    const productMap = new Map<string, RecommendationResult>();

    for (const rec of recommendations) {
      const key = rec.productId.toString();
      const existing = productMap.get(key);

      if (existing) {
        // Combine scores and reasons
        existing.score = Math.max(existing.score, rec.score);
        existing.confidence = Math.max(existing.confidence, rec.confidence);
        existing.reason = existing.reason.includes(rec.reason)
          ? existing.reason
          : `${existing.reason}, ${rec.reason}`;
      } else {
        productMap.set(key, { ...rec });
      }
    }

    return Array.from(productMap.values());
  }
}
