import { SearchableProduct } from '../types/search.types';
import { SearchFacets } from '../types/search.types';

export class FacetIndex {
  private categoryCounts: Map<string, number> = new Map();
  private brandCounts: Map<string, number> = new Map();
  private priceBucketCounts: Map<string, number> = new Map();
  private ratingBucketCounts: Map<string, number> = new Map();
  private typeCounts: Map<string, number> = new Map();
  
  private productData: Map<string, {
    category?: string;
    brand?: string;
    price: number;
    rating?: number;
    type?: string;
  }> = new Map();

  build(products: SearchableProduct[]): void {
    this.categoryCounts.clear();
    this.brandCounts.clear();
    this.priceBucketCounts.clear();
    this.ratingBucketCounts.clear();
    this.typeCounts.clear();
    this.productData.clear();

    for (const product of products) {
      this.indexProduct(product);
    }
  }

  updateProduct(oldProduct: SearchableProduct, newProduct: SearchableProduct): void {
    this.removeProduct(oldProduct);
    this.indexProduct(newProduct);
  }

  getFacets(filteredIds: Set<string>): SearchFacets {
    const categories: Record<string, number> = {};
    const brands: Record<string, number> = {};
    const priceRanges: Array<{ min: number; max: number; count: number }> = [];
    const ratings: Array<{ rating: number; count: number }> = [];

    for (const id of filteredIds) {
      const data = this.productData.get(id);
      if (!data) continue;

      if (data.category) {
        categories[data.category] = (categories[data.category] || 0) + 1;
      }
      if (data.brand) {
        brands[data.brand] = (brands[data.brand] || 0) + 1;
      }
    }

    const priceCounts = new Map<string, number>();
    const ratingCounts = new Map<number, number>();

    for (const id of filteredIds) {
      const data = this.productData.get(id);
      if (!data) continue;

      const priceBucket = this.getPriceBucket(data.price);
      priceCounts.set(priceBucket, (priceCounts.get(priceBucket) || 0) + 1);

      if (data.rating !== undefined) {
        const ratingBucket = Math.floor(data.rating);
        ratingCounts.set(ratingBucket, (ratingCounts.get(ratingBucket) || 0) + 1);
      }
    }

    const priceRangeMap = [
      { min: 0, max: 50 },
      { min: 50, max: 100 },
      { min: 100, max: 200 },
      { min: 200, max: 500 },
      { min: 500, max: Infinity }
    ];

    for (const range of priceRangeMap) {
      let count = 0;
      for (const [bucket, cnt] of priceCounts) {
        const bucketVal = parseInt(bucket);
        if (bucketVal >= range.min && bucketVal < range.max) {
          count += cnt;
        }
      }
      priceRanges.push({ ...range, count });
    }

    for (let rating = 1; rating <= 5; rating++) {
      ratings.push({ rating, count: ratingCounts.get(rating) || 0 });
    }

    return { categories, brands, priceRanges, ratings };
  }

  private indexProduct(product: SearchableProduct): void {
    this.productData.set(product.id, {
      category: product.category,
      brand: product.brand,
      price: product.price,
      rating: product.rating,
      type: product.type
    });

    if (product.category) {
      this.categoryCounts.set(
        product.category,
        (this.categoryCounts.get(product.category) || 0) + 1
      );
    }

    if (product.brand) {
      this.brandCounts.set(
        product.brand,
        (this.brandCounts.get(product.brand) || 0) + 1
      );
    }

    const priceBucket = this.getPriceBucket(product.price);
    this.priceBucketCounts.set(
      priceBucket,
      (this.priceBucketCounts.get(priceBucket) || 0) + 1
    );

    if (product.rating !== undefined) {
      const ratingBucket = Math.floor(product.rating).toString();
      this.ratingBucketCounts.set(
        ratingBucket,
        (this.ratingBucketCounts.get(ratingBucket) || 0) + 1
      );
    }

    if (product.type) {
      this.typeCounts.set(
        product.type,
        (this.typeCounts.get(product.type) || 0) + 1
      );
    }
  }

  private removeProduct(product: SearchableProduct): void {
    this.productData.delete(product.id);

    if (product.category) {
      const count = this.categoryCounts.get(product.category) || 0;
      if (count > 1) {
        this.categoryCounts.set(product.category, count - 1);
      } else {
        this.categoryCounts.delete(product.category);
      }
    }

    if (product.brand) {
      const count = this.brandCounts.get(product.brand) || 0;
      if (count > 1) {
        this.brandCounts.set(product.brand, count - 1);
      } else {
        this.brandCounts.delete(product.brand);
      }
    }

    const priceBucket = this.getPriceBucket(product.price);
    const priceCount = this.priceBucketCounts.get(priceBucket) || 0;
    if (priceCount > 1) {
      this.priceBucketCounts.set(priceBucket, priceCount - 1);
    } else {
      this.priceBucketCounts.delete(priceBucket);
    }

    if (product.rating !== undefined) {
      const ratingBucket = Math.floor(product.rating).toString();
      const ratingCount = this.ratingBucketCounts.get(ratingBucket) || 0;
      if (ratingCount > 1) {
        this.ratingBucketCounts.set(ratingBucket, ratingCount - 1);
      } else {
        this.ratingBucketCounts.delete(ratingBucket);
      }
    }

    if (product.type) {
      const count = this.typeCounts.get(product.type) || 0;
      if (count > 1) {
        this.typeCounts.set(product.type, count - 1);
      } else {
        this.typeCounts.delete(product.type);
      }
    }
  }

  private getPriceBucket(price: number): string {
    return (Math.floor(price / 50) * 50).toString();
  }
}
