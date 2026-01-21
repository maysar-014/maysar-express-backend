/**
 * Recommendation Algorithms
 * Pure algorithmic implementations for product recommendations
 * No external dependencies - pure mathematical computations
 */

export interface UserVector {
  userId: string;
  preferences: Map<string, number>; // category -> preference score
  purchaseHistory: Set<string>; // product IDs
  viewHistory: Set<string>; // product IDs
  ratings: Map<string, number>; // product ID -> rating
}

export interface ProductVector {
  productId: string;
  features: Map<string, number>; // feature -> weight
  category: string;
  price: number;
  popularity: number;
  tags: Set<string>;
  averageRating: number;
  reviewCount: number;
}

export interface SimilarityResult {
  itemId: string;
  similarity: number;
  confidence: number;
}

/**
 * Cosine Similarity Algorithm
 * Measures similarity between two vectors using cosine of the angle between them
 */
export class CosineSimilarityAlgorithm {
  calculateSimilarity(vectorA: Map<string, number>, vectorB: Map<string, number>): number {
    const commonKeys = new Set([...Array.from(vectorA.keys()), ...Array.from(vectorB.keys())]);
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (const key of Array.from(commonKeys)) {
      const valA = vectorA.get(key) || 0;
      const valB = vectorB.get(key) || 0;

      dotProduct += valA * valB;
      normA += valA * valA;
      normB += valB * valB;
    }

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  findSimilarUsers(targetUser: UserVector, allUsers: UserVector[], minCommonItems: number = 3): SimilarityResult[] {
    const results: SimilarityResult[] = [];

    for (const user of allUsers) {
      if (user.userId === targetUser.userId) continue;

      // Calculate common items
      const commonPurchases = new Set(Array.from(targetUser.purchaseHistory).filter(x => user.purchaseHistory.has(x)));
      const commonViews = new Set(Array.from(targetUser.viewHistory).filter(x => user.viewHistory.has(x)));

      const totalCommon = commonPurchases.size + commonViews.size;
      if (totalCommon < minCommonItems) continue;

      // Create preference vectors
      const targetVector = this.createPreferenceVector(targetUser);
      const userVector = this.createPreferenceVector(user);

      const similarity = this.calculateSimilarity(targetVector, userVector);

      if (similarity > 0) {
        results.push({
          itemId: user.userId,
          similarity,
          confidence: Math.min(totalCommon / 10, 1.0) // Confidence based on common items
        });
      }
    }

    return results.sort((a, b) => b.similarity - a.similarity);
  }

  findSimilarProducts(targetProduct: ProductVector, allProducts: ProductVector[], minSimilarity: number = 0.1): SimilarityResult[] {
    const results: SimilarityResult[] = [];

    for (const product of allProducts) {
      if (product.productId === targetProduct.productId) continue;

      // Category boost for same category
      let similarity = this.calculateSimilarity(targetProduct.features, product.features);
      if (targetProduct.category === product.category) {
        similarity *= 1.2; // 20% boost for same category
      }

      // Price similarity factor
      const priceDiff = Math.abs(targetProduct.price - product.price);
      const avgPrice = (targetProduct.price + product.price) / 2;
      const priceSimilarity = 1 - Math.min(priceDiff / avgPrice, 1);
      similarity = similarity * 0.7 + priceSimilarity * 0.3; // Weighted combination

      if (similarity >= minSimilarity) {
        results.push({
          itemId: product.productId,
          similarity,
          confidence: Math.min(similarity + 0.2, 1.0)
        });
      }
    }

    return results.sort((a, b) => b.similarity - a.similarity);
  }

  private createPreferenceVector(user: UserVector): Map<string, number> {
    const vector = new Map<string, number>();

    // Purchase preferences (higher weight)
    for (const productId of user.purchaseHistory) {
      const current = vector.get(productId) || 0;
      vector.set(productId, current + 5.0); // Purchase weight
    }

    // View preferences (lower weight)
    for (const productId of user.viewHistory) {
      if (!user.purchaseHistory.has(productId)) { // Don't double-count purchases
        const current = vector.get(productId) || 0;
        vector.set(productId, current + 2.0); // View weight
      }
    }

    // Rating preferences
    for (const [productId, rating] of user.ratings) {
      const current = vector.get(productId) || 0;
      vector.set(productId, current + rating); // Rating as weight
    }

    return vector;
  }
}

/**
 * Pearson Correlation Algorithm
 * Measures linear correlation between user preferences
 */
export class PearsonCorrelationAlgorithm {
  calculateCorrelation(userA: UserVector, userB: UserVector, minCommonRatings: number = 3): number {
    const commonProducts = new Set<string>();

    // Find products rated by both users
    for (const productId of userA.ratings.keys()) {
      if (userB.ratings.has(productId)) {
        commonProducts.add(productId);
      }
    }

    if (commonProducts.size < minCommonRatings) {
      return 0; // Insufficient data for correlation
    }

    const n = commonProducts.size;
    let sumA = 0, sumB = 0, sumASquared = 0, sumBSquared = 0, sumAB = 0;

    for (const productId of commonProducts) {
      const ratingA = userA.ratings.get(productId)!;
      const ratingB = userB.ratings.get(productId)!;

      sumA += ratingA;
      sumB += ratingB;
      sumASquared += ratingA * ratingA;
      sumBSquared += ratingB * ratingB;
      sumAB += ratingA * ratingB;
    }

    const numerator = n * sumAB - sumA * sumB;
    const denominatorA = n * sumASquared - sumA * sumA;
    const denominatorB = n * sumBSquared - sumB * sumB;

    if (denominatorA <= 0 || denominatorB <= 0) {
      return 0; // Avoid division by zero
    }

    const correlation = numerator / Math.sqrt(denominatorA * denominatorB);

    // Ensure result is between -1 and 1
    return Math.max(-1, Math.min(1, correlation));
  }

  findUserCorrelations(targetUser: UserVector, allUsers: UserVector[]): SimilarityResult[] {
    const results: SimilarityResult[] = [];

    for (const user of allUsers) {
      if (user.userId === targetUser.userId) continue;

      const correlation = this.calculateCorrelation(targetUser, user);

      if (!isNaN(correlation) && Math.abs(correlation) > 0.1) { // Minimum correlation threshold
        results.push({
          itemId: user.userId,
          similarity: correlation,
          confidence: Math.min(Math.abs(correlation) + 0.3, 1.0)
        });
      }
    }

    return results.sort((a, b) => Math.abs(b.similarity) - Math.abs(a.similarity));
  }
}

/**
 * Jaccard Similarity Algorithm
 * Measures similarity between sets using intersection over union
 */
export class JaccardSimilarityAlgorithm {
  calculateSimilarity(setA: Set<string>, setB: Set<string>): number {
    if (setA.size === 0 && setB.size === 0) return 1.0; // Both empty sets are identical
    if (setA.size === 0 || setB.size === 0) return 0.0; // One empty set

    const intersection = new Set(Array.from(setA).filter(x => setB.has(x)));
    const union = new Set([...Array.from(setA), ...Array.from(setB)]);

    return intersection.size / union.size;
  }

  findSimilarProductsByTags(targetProduct: ProductVector, allProducts: ProductVector[]): SimilarityResult[] {
    const results: SimilarityResult[] = [];

    for (const product of allProducts) {
      if (product.productId === targetProduct.productId) continue;

      const similarity = this.calculateSimilarity(targetProduct.tags, product.tags);

      if (similarity > 0) {
        results.push({
          itemId: product.productId,
          similarity,
          confidence: Math.min(similarity + 0.2, 1.0)
        });
      }
    }

    return results.sort((a, b) => b.similarity - a.similarity);
  }

  findSimilarUsersByHistory(targetUser: UserVector, allUsers: UserVector[]): SimilarityResult[] {
    const results: SimilarityResult[] = [];

    // Combine purchase and view history for comparison
    const targetHistory = new Set([...Array.from(targetUser.purchaseHistory), ...Array.from(targetUser.viewHistory)]);

    for (const user of allUsers) {
      if (user.userId === targetUser.userId) continue;

      const userHistory = new Set([...Array.from(user.purchaseHistory), ...Array.from(user.viewHistory)]);
      const similarity = this.calculateSimilarity(targetHistory, userHistory);

      if (similarity > 0) {
        results.push({
          itemId: user.userId,
          similarity,
          confidence: Math.min(similarity + 0.3, 1.0)
        });
      }
    }

    return results.sort((a, b) => b.similarity - a.similarity);
  }
}

/**
 * Weighted Hybrid Algorithm
 * Combines multiple similarity algorithms with configurable weights
 */
export class WeightedHybridSimilarityAlgorithm {
  constructor(
    private algorithms: Array<{
      algorithm: any;
      weight: number;
      name: string;
    }> = []
  ) {}

  addAlgorithm(algorithm: any, weight: number, name: string): void {
    this.algorithms.push({ algorithm, weight, name });
  }

  calculateHybridSimilarity(
    targetItem: any,
    candidateItems: any[],
    method: 'user_similarity' | 'product_similarity' = 'product_similarity'
  ): SimilarityResult[] {
    const itemScores = new Map<string, { totalScore: number; totalWeight: number; results: SimilarityResult[] }>();

    // Get similarity scores from each algorithm
    for (const { algorithm, weight, name } of this.algorithms) {
      let results: SimilarityResult[] = [];

      try {
        if (method === 'user_similarity') {
          results = algorithm.findSimilarUsers(targetItem, candidateItems);
        } else {
          results = algorithm.findSimilarProducts(targetItem, candidateItems);
        }
      } catch (error) {
        console.warn(`Algorithm ${name} failed:`, error);
        continue;
      }

      // Accumulate weighted scores
      for (const result of results) {
        const existing = itemScores.get(result.itemId) || {
          totalScore: 0,
          totalWeight: 0,
          results: []
        };

        existing.totalScore += result.similarity * weight;
        existing.totalWeight += weight;
        existing.results.push(result);

        itemScores.set(result.itemId, existing);
      }
    }

    // Calculate final weighted averages
    const finalResults: SimilarityResult[] = [];

    for (const itemId of Array.from(itemScores.keys())) {
      const scores = itemScores.get(itemId)!;
      if (scores.totalWeight === 0) continue;

      const averageSimilarity = scores.totalScore / scores.totalWeight;
      const averageConfidence = scores.results.reduce((sum, r) => sum + r.confidence, 0) / scores.results.length;

      finalResults.push({
        itemId,
        similarity: averageSimilarity,
        confidence: averageConfidence
      });
    }

    return finalResults.sort((a, b) => b.similarity - a.similarity);
  }
}

/**
 * Content-Based Filtering Algorithm
 * Recommends items based on content similarity
 */
export class ContentBasedFilteringAlgorithm {
  calculateTFIDFScore(term: string, document: string[], corpus: string[][]): number {
    // Term Frequency
    const tf = document.filter(word => word === term).length / document.length;

    // Inverse Document Frequency
    let documentsWithTerm = 0;
    for (const doc of corpus) {
      if (doc.includes(term)) documentsWithTerm++;
    }

    const idf = Math.log(corpus.length / (1 + documentsWithTerm));

    return tf * idf;
  }

  createTFIDFVector(document: string[], corpus: string[][], vocabulary: Set<string>): Map<string, number> {
    const vector = new Map<string, number>();

    for (const term of vocabulary) {
      const score = this.calculateTFIDFScore(term, document, corpus);
      if (score > 0) {
        vector.set(term, score);
      }
    }

    return vector;
  }

  findSimilarContent(targetContent: string[], allContent: Array<{ id: string; content: string[] }>): SimilarityResult[] {
    const results: SimilarityResult[] = [];

    // Build corpus
    const corpus = allContent.map(item => item.content);
    const vocabulary = new Set<string>();

    // Build vocabulary
    for (const doc of corpus) {
      for (const word of doc) {
        vocabulary.add(word.toLowerCase());
      }
    }

    // Create target vector
    const targetVector = this.createTFIDFVector(targetContent, corpus, vocabulary);

    for (const item of allContent) {
      const itemVector = this.createTFIDFVector(item.content, corpus, vocabulary);

      // Calculate cosine similarity
      const similarity = this.cosineSimilarity(targetVector, itemVector);

      if (similarity > 0) {
        results.push({
          itemId: item.id,
          similarity,
          confidence: Math.min(similarity + 0.1, 1.0)
        });
      }
    }

    return results.sort((a, b) => b.similarity - a.similarity);
  }

  private cosineSimilarity(vectorA: Map<string, number>, vectorB: Map<string, number>): number {
    const cosineAlgo = new CosineSimilarityAlgorithm();
    return cosineAlgo.calculateSimilarity(vectorA, vectorB);
  }
}

/**
 * Popularity-Based Algorithm
 * Recommends items based on popularity metrics
 */
export class PopularityBasedAlgorithm {
  calculatePopularityScore(
    item: {
      views: number;
      purchases: number;
      ratings: number[];
      age: number; // days since creation
    },
    totalViews: number,
    totalPurchases: number
  ): number {
    // Normalized view score
    const viewScore = item.views / Math.max(totalViews, 1);

    // Purchase conversion rate
    const conversionScore = item.purchases / Math.max(item.views, 1);

    // Average rating (normalized to 0-1)
    const avgRating = item.ratings.length > 0
      ? item.ratings.reduce((a, b) => a + b, 0) / item.ratings.length
      : 0;
    const ratingScore = avgRating / 5.0; // Assuming 5-star scale

    // Recency factor (newer items get slight boost)
    const recencyScore = Math.max(0, 1 - (item.age / 365)); // Favor items less than a year old

    // Weighted combination
    const score = (
      viewScore * 0.3 +
      conversionScore * 0.4 +
      ratingScore * 0.2 +
      recencyScore * 0.1
    );

    return Math.min(score, 1.0); // Cap at 1.0
  }

  rankByPopularity(items: Array<{ id: string; metrics: any }>): SimilarityResult[] {
    const totalViews = items.reduce((sum, item) => sum + item.metrics.views, 0);
    const totalPurchases = items.reduce((sum, item) => sum + item.metrics.purchases, 0);

    const results: SimilarityResult[] = [];

    for (const item of items) {
      const popularityScore = this.calculatePopularityScore(item.metrics, totalViews, totalPurchases);

      results.push({
        itemId: item.id,
        similarity: popularityScore,
        confidence: 0.8 // Popularity-based recommendations are generally reliable
      });
    }

    return results.sort((a, b) => b.similarity - a.similarity);
  }
}
