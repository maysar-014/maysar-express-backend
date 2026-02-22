import { SearchableProduct } from '../types/search.types';

export class InvertedIndex {
  private postingList: Map<string, Map<string, number>> = new Map();
  private idf: Map<string, number> = new Map();
  private productTerms: Map<string, Set<string>> = new Map();
  private totalProducts = 0;

  private stopWords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'will', 'with'
  ]);

  build(products: SearchableProduct[]): void {
    this.postingList.clear();
    this.idf.clear();
    this.productTerms.clear();
    this.totalProducts = products.length;

    for (const product of products) {
      this.indexProduct(product);
    }

    this.computeIDF();
  }

  addProduct(product: SearchableProduct): void {
    this.totalProducts++;
    this.indexProduct(product);
    this.recomputeIDF(this.productTerms.get(product.id) || new Set());
  }

  removeProduct(id: string): void {
    const terms = this.productTerms.get(id);
    if (!terms) return;

    for (const term of terms) {
      const posting = this.postingList.get(term);
      if (posting) {
        posting.delete(id);
        if (posting.size === 0) {
          this.postingList.delete(term);
          this.idf.delete(term);
        }
      }
    }

    this.productTerms.delete(id);
    this.totalProducts--;
    this.recomputeIDF(terms);
  }

  lookup(terms: string[]): Map<string, number> {
    const scores = new Map<string, number>();
    
    for (const term of terms) {
      const normalizedTerm = this.normalize(term);
      const posting = this.postingList.get(normalizedTerm);
      const termIDF = this.idf.get(normalizedTerm) || 0;

      if (posting) {
        for (const [productId, tf] of posting) {
          const tfidf = tf * termIDF;
          scores.set(productId, (scores.get(productId) || 0) + tfidf);
        }
      }
    }

    return scores;
  }

  private indexProduct(product: SearchableProduct): void {
    const text = [
      product.name,
      product.description || '',
      product.brand || '',
      product.category || '',
      ...(product.tags || [])
    ].join(' ');

    const terms = this.tokenize(text);
    const termFreq = new Map<string, number>();

    for (const term of terms) {
      termFreq.set(term, (termFreq.get(term) || 0) + 1);
    }

    this.productTerms.set(product.id, new Set(termFreq.keys()));

    for (const [term, freq] of termFreq) {
      if (!this.postingList.has(term)) {
        this.postingList.set(term, new Map());
      }
      this.postingList.get(term)!.set(product.id, freq);
    }
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .map(t => t.trim())
      .filter(t => t.length > 2 && !this.stopWords.has(t));
  }

  private normalize(term: string): string {
    return term.toLowerCase().trim();
  }

  private computeIDF(): void {
    for (const [term, posting] of this.postingList) {
      const df = posting.size;
      this.idf.set(term, Math.log((this.totalProducts + 1) / (df + 1)));
    }
  }

  private recomputeIDF(affectedTerms: Set<string>): void {
    for (const term of affectedTerms) {
      const posting = this.postingList.get(term);
      if (posting) {
        const df = posting.size;
        this.idf.set(term, Math.log((this.totalProducts + 1) / (df + 1)));
      }
    }
  }
}
