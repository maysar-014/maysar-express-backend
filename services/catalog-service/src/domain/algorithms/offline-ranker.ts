import { SearchableProduct } from '../types/search.types';

export class OfflineRanker {
  private scores: Map<string, number> = new Map();

  computePageRank(
    products: SearchableProduct[],
    links: Map<string, string[]>,
    dampingFactor: number = 0.85,
    iterations: number = 20
  ): void {
    const productIds = products.map(p => p.id);
    const numProducts = productIds.length;

    let pageRanks = new Map<string, number>();
    for (const id of productIds) {
      pageRanks.set(id, 1 / numProducts);
    }

    for (let iteration = 0; iteration < iterations; iteration++) {
      const newPageRanks = new Map<string, number>();

      for (const productId of productIds) {
        let rankSum = 0;

        for (const [sourceId, targets] of links) {
          if (targets.includes(productId)) {
            const sourceRank = pageRanks.get(sourceId) || 0;
            const sourceOutlinks = targets.length;
            rankSum += sourceRank / sourceOutlinks;
          }
        }

        const newRank = (1 - dampingFactor) / numProducts + dampingFactor * rankSum;
        newPageRanks.set(productId, newRank);
      }

      pageRanks = newPageRanks;
    }

    for (const [id, rank] of pageRanks) {
      this.scores.set(id, rank);
    }
  }

  computePopularityScores(
    products: SearchableProduct[],
    metrics: Map<string, { views: number; purchases: number; rating: number }>
  ): void {
    for (const product of products) {
      const metric = metrics.get(product.id);
      if (!metric) {
        this.scores.set(product.id, 0);
        continue;
      }

      const viewScore = Math.log(metric.views + 1) * 0.3;
      const purchaseScore = Math.log(metric.purchases + 1) * 0.5;
      const ratingScore = (metric.rating / 5) * 0.2;

      const popularityScore = viewScore + purchaseScore + ratingScore;
      this.scores.set(product.id, popularityScore);
    }
  }

  getScore(productId: string): number {
    return this.scores.get(productId) || 0;
  }

  setScore(productId: string, score: number): void {
    this.scores.set(productId, score);
  }
}
