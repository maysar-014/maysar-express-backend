import { SearchableProduct } from '../types/search.types';
import { SearchQuery } from '../types/search.types';

export class FilterIndex {
  private byCategory: Map<string, Set<string>> = new Map();
  private byBrand: Map<string, Set<string>> = new Map();
  private byPriceBucket: Map<string, Set<string>> = new Map();
  private byStatus: Map<string, Set<string>> = new Map();
  private inStock: Set<string> = new Set();
  private onSale: Set<string> = new Set();
  private byTag: Map<string, Set<string>> = new Map();
  
  private readonly priceBucketSize = 50;

  build(products: SearchableProduct[]): void {
    this.byCategory.clear();
    this.byBrand.clear();
    this.byPriceBucket.clear();
    this.byStatus.clear();
    this.inStock.clear();
    this.onSale.clear();
    this.byTag.clear();

    for (const product of products) {
      this.indexProduct(product);
    }
  }

  addProduct(product: SearchableProduct): void {
    this.indexProduct(product);
  }

  removeProduct(id: string, product: SearchableProduct): void {
    if (product.category) {
      this.byCategory.get(product.category)?.delete(id);
    }
    if (product.brand) {
      this.byBrand.get(product.brand)?.delete(id);
    }
    const bucket = this.getPriceBucket(product.price);
    this.byPriceBucket.get(bucket)?.delete(id);
    if (product.status) {
      this.byStatus.get(product.status)?.delete(id);
    }
    this.inStock.delete(id);
    this.onSale.delete(id);
    product.tags?.forEach(tag => this.byTag.get(tag)?.delete(id));
  }

  filter(query: SearchQuery): Set<string> {
    const sets: Set<string>[] = [];

    if (query.filters?.category) {
      const categorySet = this.byCategory.get(query.filters.category);
      if (categorySet) sets.push(categorySet);
      else return new Set();
    }

    if (query.filters?.brand) {
      const brandSet = this.byBrand.get(query.filters.brand);
      if (brandSet) sets.push(brandSet);
      else return new Set();
    }

    if (query.filters?.minPrice !== undefined || query.filters?.maxPrice !== undefined) {
      const priceSet = this.getPriceRangeSet(query.filters.minPrice, query.filters.maxPrice);
      if (priceSet.size > 0) sets.push(priceSet);
      else return new Set();
    }

    if (query.filters?.status) {
      const statusSet = this.byStatus.get(query.filters.status);
      if (statusSet) sets.push(statusSet);
      else return new Set();
    }

    if (query.filters?.inStock) {
      sets.push(this.inStock);
    }

    if (query.filters?.onSale) {
      sets.push(this.onSale);
    }

    if (query.filters?.tags && query.filters.tags.length > 0) {
      for (const tag of query.filters.tags) {
        const tagSet = this.byTag.get(tag);
        if (tagSet) sets.push(tagSet);
        else return new Set();
      }
    }

    if (sets.length === 0) return new Set();

    return this.intersectSets(sets);
  }

  private indexProduct(product: SearchableProduct): void {
    const id = product.id;

    if (product.category) {
      if (!this.byCategory.has(product.category)) {
        this.byCategory.set(product.category, new Set());
      }
      this.byCategory.get(product.category)!.add(id);
    }

    if (product.brand) {
      if (!this.byBrand.has(product.brand)) {
        this.byBrand.set(product.brand, new Set());
      }
      this.byBrand.get(product.brand)!.add(id);
    }

    const bucket = this.getPriceBucket(product.price);
    if (!this.byPriceBucket.has(bucket)) {
      this.byPriceBucket.set(bucket, new Set());
    }
    this.byPriceBucket.get(bucket)!.add(id);

    if (product.status) {
      if (!this.byStatus.has(product.status)) {
        this.byStatus.set(product.status, new Set());
      }
      this.byStatus.get(product.status)!.add(id);
    }

    if (product.stock && product.stock > 0) {
      this.inStock.add(id);
    }

    if (product.salePrice && product.salePrice < product.price) {
      this.onSale.add(id);
    }

    product.tags?.forEach(tag => {
      if (!this.byTag.has(tag)) {
        this.byTag.set(tag, new Set());
      }
      this.byTag.get(tag)!.add(id);
    });
  }

  private getPriceBucket(price: number): string {
    const bucket = Math.floor(price / this.priceBucketSize) * this.priceBucketSize;
    return bucket.toString();
  }

  private getPriceRangeSet(minPrice?: number, maxPrice?: number): Set<string> {
    const result = new Set<string>();
    const min = minPrice ?? 0;
    const max = maxPrice ?? Infinity;

    for (const [bucketKey, ids] of this.byPriceBucket) {
      const bucketStart = parseInt(bucketKey);
      const bucketEnd = bucketStart + this.priceBucketSize;

      if (bucketEnd >= min && bucketStart <= max) {
        ids.forEach(id => result.add(id));
      }
    }

    return result;
  }

  private intersectSets(sets: Set<string>[]): Set<string> {
    if (sets.length === 0) return new Set();
    if (sets.length === 1) return new Set(sets[0]);

    sets.sort((a, b) => a.size - b.size);
    const result = new Set(sets[0]);

    for (let i = 1; i < sets.length; i++) {
      const intersection = new Set<string>();
      for (const id of result) {
        if (sets[i].has(id)) {
          intersection.add(id);
        }
      }
      if (intersection.size === 0) return new Set();
      result.clear();
      intersection.forEach(id => result.add(id));
    }

    return result;
  }
}
