import {
  CollaborativeFilteringStrategy,
  ContentBasedStrategy,
  PopularityBasedStrategy,
  ProductFeatures,
  RecommendationContext,
  RecommendationEngine,
  SeasonalStrategy
} from './recommendation-engine';
import { ProductType } from '../value-objects/product-types.value-object';

function makeProduct(id: string, overrides: Partial<ProductFeatures> = {}): ProductFeatures {
  const productId = { toString: () => id } as ProductFeatures['productId'];
  const sellerId = { toString: () => 'seller-1' } as ProductFeatures['sellerId'];
  const price = { toNumber: () => 100 } as ProductFeatures['price'];

  return {
    productId,
    sellerId,
    category: 'sports',
    price,
    type: ProductType.PHYSICAL,
    tags: ['running', 'fitness'],
    averageRating: 4.5,
    reviewCount: 30,
    popularityScore: 80,
    seasonalityFactor: 1.2,
    complementaryProducts: [],
    substituteProducts: [],
    ...overrides
  };
}

function makeContext(): RecommendationContext {
  return {
    maxRecommendations: 5,
    includeViewedProducts: false,
    userProfile: {
      userId: 'u1',
      preferences: {
        categories: ['sports'],
        priceRange: { min: 50, max: 150 },
        brands: [],
        productTypes: [ProductType.PHYSICAL]
      },
      behaviorHistory: {
        viewedProducts: [{ toString: () => 'viewed-1' } as unknown as ProductFeatures['productId']],
        purchasedProducts: [{ toString: () => 'purchased-1' } as unknown as ProductFeatures['productId']],
        cartAdditions: [],
        searchQueries: ['running shoes'],
        categoriesBrowsed: ['sports']
      }
    }
  };
}

describe('recommendation-engine', () => {
  it('generates strategy-level recommendations', () => {
    const context = makeContext();
    const baseProduct = makeProduct('purchased-1');
    const products = [
      baseProduct,
      makeProduct('candidate-1', {
        complementaryProducts: [{ toString: () => 'candidate-2' } as ProductFeatures['productId']]
      }),
      makeProduct('candidate-2', {
        price: { toNumber: () => 110 } as ProductFeatures['price'],
        popularityScore: 95
      })
    ];

    const collaborative = new CollaborativeFilteringStrategy().recommend(context, products);
    const contentBased = new ContentBasedStrategy().recommend(
      { ...context, currentProduct: baseProduct.productId },
      products
    );
    const popularity = new PopularityBasedStrategy().recommend(context, products);
    const seasonal = new SeasonalStrategy().recommend(context, products);

    expect(collaborative.length).toBeGreaterThan(0);
    expect(contentBased.length).toBeGreaterThanOrEqual(0);
    expect(popularity.length).toBeGreaterThan(0);
    expect(seasonal.length).toBeGreaterThan(0);
  });

  it('aggregates weighted strategy output and handles strategy errors', () => {
    const context = makeContext();
    const products = [makeProduct('a'), makeProduct('b')];

    const engine = new RecommendationEngine([
      {
        strategy: {
          recommend: () => [
            { productId: products[0].productId, score: 1, reason: 'A', confidence: 1, strategy: 'mock' }
          ]
        },
        weight: 0.5,
        enabled: true
      },
      {
        strategy: {
          recommend: () => {
            throw new Error('strategy failed');
          }
        },
        weight: 0.5,
        enabled: true
      },
      {
        strategy: {
          recommend: () => [
            { productId: products[0].productId, score: 0.6, reason: 'B', confidence: 0.8, strategy: 'mock2' },
            { productId: products[1].productId, score: 0.4, reason: 'C', confidence: 0.7, strategy: 'mock2' }
          ]
        },
        weight: 1.0,
        enabled: true
      }
    ]);

    const result = engine.generateRecommendations(context, products);
    expect(result.length).toBe(2);
    expect(result[0].reason).toContain('A');
    expect(result[0].reason).toContain('B');
  });

  it('returns complementary/substitute products and diversity metrics', () => {
    const p1 = makeProduct('p1', {
      complementaryProducts: [{ toString: () => 'p2' } as ProductFeatures['productId']],
      substituteProducts: [{ toString: () => 'p3' } as ProductFeatures['productId']]
    });
    const p2 = makeProduct('p2');
    const p3 = makeProduct('p3');
    const engine = new RecommendationEngine();

    const complementary = engine.generateComplementaryProducts(p1.productId, [p1, p2, p3], 5);
    const substitutes = engine.generateSubstituteProducts(p1.productId, [p1, p2, p3], 5);
    const diversity = engine.analyzeRecommendationDiversity([...complementary, ...substitutes]);

    expect(complementary[0].productId.toString()).toBe('p2');
    expect(substitutes[0].productId.toString()).toBe('p3');
    expect(diversity.overallDiversity).toBeGreaterThanOrEqual(0);
    expect(diversity.overallDiversity).toBeLessThanOrEqual(1);
  });
});
