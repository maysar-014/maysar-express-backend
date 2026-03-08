import {
  ContentBasedFilteringAlgorithm,
  CosineSimilarityAlgorithm,
  JaccardSimilarityAlgorithm,
  PearsonCorrelationAlgorithm,
  PopularityBasedAlgorithm,
  ProductVector,
  UserVector,
  WeightedHybridSimilarityAlgorithm
} from './recommendation-algorithms';

function makeUser(
  userId: string,
  purchaseHistory: string[],
  viewHistory: string[],
  ratings: Array<[string, number]>
): UserVector {
  return {
    userId,
    preferences: new Map([['sports', 1]]),
    purchaseHistory: new Set(purchaseHistory),
    viewHistory: new Set(viewHistory),
    ratings: new Map(ratings)
  };
}

function makeProduct(productId: string, category: string, price: number, tags: string[]): ProductVector {
  return {
    productId,
    features: new Map([
      ['quality', 0.9],
      ['value', 0.8]
    ]),
    category,
    price,
    popularity: 80,
    tags: new Set(tags),
    averageRating: 4.5,
    reviewCount: 100
  };
}

describe('recommendation-algorithms', () => {
  it('calculates cosine similarity and related users/products', () => {
    const cosine = new CosineSimilarityAlgorithm();
    const sim = cosine.calculateSimilarity(
      new Map([['a', 1], ['b', 2]]),
      new Map([['a', 1], ['b', 2]])
    );
    expect(sim).toBeCloseTo(1, 5);

    const targetUser = makeUser('u1', ['p1', 'p2'], ['p3'], [['p1', 5], ['p2', 4]]);
    const relatedUsers = [
      targetUser,
      makeUser('u2', ['p1', 'p2'], ['p3'], [['p1', 4], ['p2', 5]]),
      makeUser('u3', ['x'], ['y'], [['x', 2]])
    ];
    const userMatches = cosine.findSimilarUsers(targetUser, relatedUsers, 2);
    expect(userMatches.length).toBeGreaterThan(0);
    expect(userMatches[0].itemId).toBe('u2');

    const targetProduct = makeProduct('p1', 'sports', 100, ['run', 'shoe']);
    const productMatches = cosine.findSimilarProducts(targetProduct, [
      targetProduct,
      makeProduct('p2', 'sports', 110, ['run', 'training']),
      makeProduct('p3', 'home', 300, ['kitchen'])
    ]);
    expect(productMatches[0].itemId).toBe('p2');
  });

  it('computes Pearson and Jaccard similarity outputs', () => {
    const pearson = new PearsonCorrelationAlgorithm();
    const u1 = makeUser('u1', ['p1'], ['p2'], [['p1', 5], ['p2', 4], ['p3', 3]]);
    const u2 = makeUser('u2', ['p1'], ['p2'], [['p1', 4], ['p2', 3], ['p3', 2]]);
    const u3 = makeUser('u3', ['x'], ['y'], [['x', 1], ['y', 2], ['z', 1]]);
    const correlations = pearson.findUserCorrelations(u1, [u1, u2, u3]);
    expect(correlations.length).toBeGreaterThan(0);
    expect(correlations[0].itemId).toBe('u2');

    const jaccard = new JaccardSimilarityAlgorithm();
    expect(jaccard.calculateSimilarity(new Set(['a', 'b']), new Set(['a', 'b']))).toBe(1);

    const targetProduct = makeProduct('p1', 'sports', 100, ['run', 'shoe']);
    const tagMatches = jaccard.findSimilarProductsByTags(targetProduct, [
      targetProduct,
      makeProduct('p2', 'sports', 110, ['run', 'shoe']),
      makeProduct('p3', 'sports', 120, ['ball'])
    ]);
    expect(tagMatches[0].itemId).toBe('p2');
  });

  it('combines weighted hybrid scores and tolerates failing algorithms', () => {
    const hybrid = new WeightedHybridSimilarityAlgorithm();
    hybrid.addAlgorithm(
      {
        findSimilarProducts: () => [{ itemId: 'p2', similarity: 0.8, confidence: 0.9 }]
      },
      0.7,
      'algo-a'
    );
    hybrid.addAlgorithm(
      {
        findSimilarProducts: () => {
          throw new Error('boom');
        }
      },
      0.3,
      'algo-b'
    );

    const results = hybrid.calculateHybridSimilarity({ id: 'p1' }, [{ id: 'p2' }], 'product_similarity');
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual(expect.objectContaining({ itemId: 'p2' }));
  });

  it('scores content similarity and popularity ranking', () => {
    const content = new ContentBasedFilteringAlgorithm();
    const contentMatches = content.findSimilarContent(
      ['running', 'shoe', 'guide'],
      [
        { id: 'a', content: ['running', 'shoe', 'tips'] },
        { id: 'b', content: ['kitchen', 'mixer'] },
        { id: 'c', content: ['delivery', 'tracking'] }
      ]
    );
    expect(contentMatches.length).toBeGreaterThan(0);
    expect(contentMatches[0].itemId).toBe('a');

    const popularity = new PopularityBasedAlgorithm();
    const ranked = popularity.rankByPopularity([
      { id: 'p1', metrics: { views: 100, purchases: 20, ratings: [4, 5], age: 10 } },
      { id: 'p2', metrics: { views: 20, purchases: 1, ratings: [3], age: 300 } }
    ]);
    expect(ranked[0].itemId).toBe('p1');
    expect(ranked[0].similarity).toBeGreaterThan(ranked[1].similarity);
  });
});
