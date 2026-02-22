import { IndexManager } from './domain/indexes';
import { InvertedIndex, FilterIndex, NGramIndex, FacetIndex } from './domain/indexes';
import { OfflineRanker } from './domain/algorithms';
import { OptimizedProductSearchEngine } from './domain/engines/optimized-search-engine';
import { SearchableProduct } from './domain/types/search.types';
import { PrismaClient } from '@prisma/client';

export class SearchEngineInitializer {
  private static indexManager: IndexManager;
  private static searchEngine: OptimizedProductSearchEngine;

  static async initialize(prisma: PrismaClient) {
    console.log('Initializing optimized search indexes...');
    
    const invertedIndex = new InvertedIndex();
    const filterIndex = new FilterIndex();
    const ngramIndex = new NGramIndex();
    const facetIndex = new FacetIndex();
    const offlineRanker = new OfflineRanker();
    
    this.indexManager = new IndexManager(
      invertedIndex,
      filterIndex,
      ngramIndex,
      facetIndex,
      offlineRanker
    );
    
    const products = await prisma.product.findMany({
      include: { variants: true, category: true }
    });
    
    const searchableProducts: SearchableProduct[] = products.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description || '',
      price: p.variants[0]?.price || 0,
      salePrice: p.variants[0]?.compareAtPrice,
      category: p.category?.name,
      brand: p.brand,
      tags: p.tags as string[] || [],
      status: p.status,
      stock: p.variants.reduce((sum, v) => sum + (v.stock || 0), 0),
      rating: 0,
      type: p.type,
      views: 0,
      purchases: 0
    }));
    
    await this.indexManager.initialize(searchableProducts);
    
    const productMap = new Map(searchableProducts.map(p => [p.id, p]));
    
    this.searchEngine = new OptimizedProductSearchEngine(
      invertedIndex,
      filterIndex,
      ngramIndex,
      facetIndex,
      offlineRanker,
      productMap
    );
    
    console.log(`Search indexes initialized with ${searchableProducts.length} products`);
    
    return { indexManager: this.indexManager, searchEngine: this.searchEngine };
  }

  static getIndexManager() {
    return this.indexManager;
  }

  static getSearchEngine() {
    return this.searchEngine;
  }
}
