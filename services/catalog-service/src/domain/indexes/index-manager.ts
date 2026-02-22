import { SearchableProduct } from '../types/search.types';
import { InvertedIndex } from './inverted-index';
import { FilterIndex } from './filter-index';
import { NGramIndex } from './ngram-index';
import { FacetIndex } from './facet-index';
import { OfflineRanker } from '../algorithms/offline-ranker';

export class IndexManager {
  constructor(
    private invertedIndex: InvertedIndex,
    private filterIndex: FilterIndex,
    private ngramIndex: NGramIndex,
    private facetIndex: FacetIndex,
    private offlineRanker: OfflineRanker
  ) {}

  async initialize(products: SearchableProduct[]): Promise<void> {
    console.log(`Initializing indexes with ${products.length} products...`);
    const startTime = Date.now();

    await Promise.all([
      Promise.resolve(this.invertedIndex.build(products)),
      Promise.resolve(this.filterIndex.build(products)),
      Promise.resolve(this.ngramIndex.build(products)),
      Promise.resolve(this.facetIndex.build(products))
    ]);

    const metrics = new Map<string, { views: number; purchases: number; rating: number }>();
    for (const product of products) {
      metrics.set(product.id, {
        views: product.views || 0,
        purchases: product.purchases || 0,
        rating: product.rating || 0
      });
    }
    this.offlineRanker.computePopularityScores(products, metrics);

    const duration = Date.now() - startTime;
    console.log(`Indexes initialized in ${duration}ms`);
  }

  onProductCreated(product: SearchableProduct): void {
    this.invertedIndex.addProduct(product);
    this.filterIndex.addProduct(product);
    this.ngramIndex.addProduct(product);
    
    const metric = {
      views: product.views || 0,
      purchases: product.purchases || 0,
      rating: product.rating || 0
    };
    const viewScore = Math.log(metric.views + 1) * 0.3;
    const purchaseScore = Math.log(metric.purchases + 1) * 0.5;
    const ratingScore = (metric.rating / 5) * 0.2;
    this.offlineRanker.setScore(product.id, viewScore + purchaseScore + ratingScore);
  }

  onProductUpdated(oldProduct: SearchableProduct, newProduct: SearchableProduct): void {
    this.invertedIndex.removeProduct(oldProduct.id);
    this.invertedIndex.addProduct(newProduct);

    this.filterIndex.removeProduct(oldProduct.id, oldProduct);
    this.filterIndex.addProduct(newProduct);

    this.ngramIndex.removeProduct(oldProduct.id, oldProduct);
    this.ngramIndex.addProduct(newProduct);

    this.facetIndex.updateProduct(oldProduct, newProduct);

    const metric = {
      views: newProduct.views || 0,
      purchases: newProduct.purchases || 0,
      rating: newProduct.rating || 0
    };
    const viewScore = Math.log(metric.views + 1) * 0.3;
    const purchaseScore = Math.log(metric.purchases + 1) * 0.5;
    const ratingScore = (metric.rating / 5) * 0.2;
    this.offlineRanker.setScore(newProduct.id, viewScore + purchaseScore + ratingScore);
  }

  onProductDeleted(id: string, product: SearchableProduct): void {
    this.invertedIndex.removeProduct(id);
    this.filterIndex.removeProduct(id, product);
    this.ngramIndex.removeProduct(id, product);
    this.offlineRanker.setScore(id, 0);
  }
}
