import { PrismaClient } from '@prisma/client';
import { SearchService } from '../../domain/interfaces';
import { ElasticsearchProvider } from '../providers/search.provider';

type SearchableCatalogProduct = {
  id: string;
  sellerId: string;
  title: string;
  description: string | null;
  categoryId: string;
  supplierLocationId: string | null;
  supplierLocation: string | null;
  brand: string | null;
  tags: string[];
  status: string;
  visibility: string;
  createdAt: Date;
  updatedAt: Date;
  seoMetadata: unknown;
  variants: Array<{
    price: unknown;
    status: string;
    attributes: unknown;
    createdAt?: Date;
  }>;
};

export interface CatalogSearchIndexerSummary {
  indexed: number;
  removed: number;
  skipped: number;
}

export class CatalogSearchIndexer {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly searchService: SearchService,
    private readonly indexName: string,
    private readonly searchProvider?: ElasticsearchProvider
  ) {}

  async syncProductById(productId: string): Promise<'indexed' | 'removed' | 'skipped'> {
    const product = await this.fetchProductById(productId);

    if (!product) {
      await this.searchService.remove(productId).catch(() => undefined);
      return 'removed';
    }

    if (!this.shouldIndex(product)) {
      await this.searchService.remove(productId).catch(() => undefined);
      return 'skipped';
    }

    await this.searchService.index(this.toSearchDocument(product));
    return 'indexed';
  }

  async removeProductById(productId: string): Promise<void> {
    await this.searchService.remove(productId);
  }

  async syncProductIds(productIds: string[], batchSize = 200): Promise<CatalogSearchIndexerSummary> {
    const uniqueIds = Array.from(new Set(productIds.filter(Boolean)));
    const summary: CatalogSearchIndexerSummary = { indexed: 0, removed: 0, skipped: 0 };

    if (uniqueIds.length === 0) {
      return summary;
    }

    for (let offset = 0; offset < uniqueIds.length; offset += batchSize) {
      const batchIds = uniqueIds.slice(offset, offset + batchSize);
      const products = await this.fetchProducts({ ids: batchIds });
      const productMap = new Map(products.map(product => [product.id, product]));
      const searchableProducts: SearchableCatalogProduct[] = [];

      for (const productId of batchIds) {
        const product = productMap.get(productId);
        if (!product) {
          await this.searchService.remove(productId).catch(() => undefined);
          summary.removed += 1;
          continue;
        }

        if (!this.shouldIndex(product)) {
          await this.searchService.remove(product.id).catch(() => undefined);
          summary.skipped += 1;
          continue;
        }

        searchableProducts.push(product);
      }

      if (searchableProducts.length === 0) {
        continue;
      }

      if (this.searchProvider) {
        await this.searchProvider.bulkIndex(
          searchableProducts.map(product => ({
            id: product.id,
            index: this.indexName,
            data: this.toSearchDocument(product)
          }))
        );
      } else {
        for (const product of searchableProducts) {
          await this.searchService.index(this.toSearchDocument(product));
        }
      }

      summary.indexed += searchableProducts.length;
    }

    return summary;
  }

  async reindexPublishedProducts(limit?: number, batchSize = 200): Promise<CatalogSearchIndexerSummary> {
    const products = await this.fetchProducts({ limit, publishedOnly: true });
    return this.syncProductIds(products.map(product => product.id), batchSize);
  }

  private async fetchProductById(productId: string): Promise<SearchableCatalogProduct | null> {
    const products = await this.fetchProducts({ ids: [productId] });
    return products[0] || null;
  }

  private async fetchProducts(options: {
    ids?: string[];
    limit?: number;
    publishedOnly?: boolean;
  }): Promise<SearchableCatalogProduct[]> {
    const where: Record<string, unknown> = {};

    if (options.ids?.length) {
      where.id = { in: options.ids };
    }

    if (options.publishedOnly) {
      where.status = 'published';
      where.visibility = 'public';
    }

    return this.prisma.product.findMany({
      where: where as never,
      include: {
        variants: {
          orderBy: {
            createdAt: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      },
      take: options.limit
    }) as Promise<SearchableCatalogProduct[]>;
  }

  private shouldIndex(product: SearchableCatalogProduct): boolean {
    return product.status === 'published' && product.visibility === 'public';
  }

  private toSearchDocument(product: SearchableCatalogProduct) {
    const primaryVariant = product.variants.find(variant => variant.status === 'active') || product.variants[0];
    const price = primaryVariant ? this.toNumber(primaryVariant.price) : 0;
    const currency = this.resolveCurrency(product, primaryVariant);
    const searchableText = [
      product.title,
      product.brand || '',
      product.supplierLocation || '',
      product.description || '',
      ...(product.tags || [])
    ].join(' ').trim();

    return {
      id: product.id,
      name: product.title,
      title: product.title,
      description: product.description || '',
      searchableText,
      price,
      currency,
      categoryId: product.categoryId,
      sellerId: product.sellerId,
      supplierLocationId: product.supplierLocationId || this.resolveSupplierLocationIdFromMetadata(product.seoMetadata),
      supplierLocation: product.supplierLocation || this.resolveSupplierLocationFromMetadata(product.seoMetadata),
      type: 'physical',
      tags: product.tags || [],
      status: product.status,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    };
  }

  private resolveCurrency(
    product: Pick<SearchableCatalogProduct, 'seoMetadata'>,
    variant?: Pick<SearchableCatalogProduct['variants'][number], 'attributes'>
  ): string {
    const variantAttributes = variant?.attributes as Record<string, unknown> | null | undefined;
    const seoMetadata = product.seoMetadata as Record<string, unknown> | null | undefined;

    if (typeof variantAttributes?.currency === 'string' && variantAttributes.currency.trim()) {
      return variantAttributes.currency;
    }

    if (typeof seoMetadata?.currency === 'string' && seoMetadata.currency.trim()) {
      return seoMetadata.currency;
    }

    return 'TZS';
  }

  private resolveSupplierLocationFromMetadata(seoMetadataValue: unknown): string | undefined {
    const seoMetadata = seoMetadataValue as Record<string, unknown> | null | undefined;
    if (typeof seoMetadata?.supplierLocation === 'string' && seoMetadata.supplierLocation.trim()) {
      return seoMetadata.supplierLocation;
    }

    return undefined;
  }

  private resolveSupplierLocationIdFromMetadata(seoMetadataValue: unknown): string | undefined {
    const seoMetadata = seoMetadataValue as Record<string, unknown> | null | undefined;
    if (typeof seoMetadata?.supplierLocationId === 'string' && seoMetadata.supplierLocationId.trim()) {
      return seoMetadata.supplierLocationId;
    }

    return undefined;
  }

  private toNumber(value: unknown): number {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    if (value && typeof value === 'object' && 'toString' in value && typeof value.toString === 'function') {
      const parsed = Number(value.toString());
      return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
  }
}
