import { SearchableProduct } from '../types/search.types';

export class NGramIndex {
  private ngrams: Map<string, Set<string>> = new Map();
  private readonly ngramSize = 3;

  build(products: SearchableProduct[]): void {
    this.ngrams.clear();

    for (const product of products) {
      this.indexProduct(product);
    }
  }

  addProduct(product: SearchableProduct): void {
    this.indexProduct(product);
  }

  removeProduct(id: string, product: SearchableProduct): void {
    const text = [
      product.name,
      product.brand || '',
      ...(product.tags || [])
    ].join(' ');

    const grams = this.extractNGrams(text);
    grams.forEach(gram => {
      this.ngrams.get(gram)?.delete(id);
    });
  }

  fuzzyLookup(term: string, minOverlap: number = 2): Set<string> {
    const queryGrams = this.extractNGrams(term);
    if (queryGrams.length === 0) return new Set();

    const candidates = new Map<string, number>();

    for (const gram of queryGrams) {
      const productIds = this.ngrams.get(gram);
      if (productIds) {
        for (const id of productIds) {
          candidates.set(id, (candidates.get(id) || 0) + 1);
        }
      }
    }

    const result = new Set<string>();
    for (const [id, overlap] of candidates) {
      if (overlap >= minOverlap) {
        result.add(id);
      }
    }

    return result;
  }

  private indexProduct(product: SearchableProduct): void {
    const text = [
      product.name,
      product.brand || '',
      ...(product.tags || [])
    ].join(' ');

    const grams = this.extractNGrams(text);
    
    for (const gram of grams) {
      if (!this.ngrams.has(gram)) {
        this.ngrams.set(gram, new Set());
      }
      this.ngrams.get(gram)!.add(product.id);
    }
  }

  private extractNGrams(text: string): string[] {
    const normalized = text.toLowerCase().replace(/[^\w\s]/g, '');
    const words = normalized.split(/\s+/).filter(w => w.length > 0);
    const grams: string[] = [];

    for (const word of words) {
      if (word.length < this.ngramSize) {
        grams.push(word);
        continue;
      }

      for (let i = 0; i <= word.length - this.ngramSize; i++) {
        grams.push(word.substring(i, i + this.ngramSize));
      }
    }

    return grams;
  }
}
