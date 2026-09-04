import { UpdateProductDto } from '../dto/product.dto';

interface ProductRepositoryLike {
  findById(id: string): Promise<any | null>;
  updateStatus(id: string, status: string): Promise<any>;
  delete(id: string): Promise<boolean>;
  updateDetails?(id: string, updates: Record<string, unknown>): Promise<any>;
}

interface CatalogSearchIndexerLike {
  syncProductById(productId: string): Promise<'indexed' | 'removed' | 'skipped'>;
  removeProductById(productId: string): Promise<void>;
}

export class PublishProductUseCase {
  constructor(
    private readonly productRepository: ProductRepositoryLike,
    private readonly catalogSearchIndexer: CatalogSearchIndexerLike
  ) {}

  async execute(productId: string): Promise<{ status: 'success' | 'not_found'; productId: string }> {
    const existing = await this.productRepository.findById(productId);
    if (!existing) {
      return { status: 'not_found', productId };
    }

    await this.productRepository.updateStatus(productId, 'published');
    await this.catalogSearchIndexer.syncProductById(productId);

    return { status: 'success', productId };
  }
}

export class UnpublishProductUseCase {
  constructor(
    private readonly productRepository: ProductRepositoryLike,
    private readonly catalogSearchIndexer: CatalogSearchIndexerLike
  ) {}

  async execute(productId: string): Promise<{ status: 'success' | 'not_found'; productId: string }> {
    const existing = await this.productRepository.findById(productId);
    if (!existing) {
      return { status: 'not_found', productId };
    }

    await this.productRepository.updateStatus(productId, 'draft');
    await this.catalogSearchIndexer.removeProductById(productId);

    return { status: 'success', productId };
  }
}

export class DeleteProductUseCase {
  constructor(
    private readonly productRepository: ProductRepositoryLike,
    private readonly catalogSearchIndexer: CatalogSearchIndexerLike
  ) {}

  async execute(productId: string): Promise<{ status: 'success' | 'not_found'; productId: string }> {
    const existing = await this.productRepository.findById(productId);
    if (!existing) {
      return { status: 'not_found', productId };
    }

    const deleted = await this.productRepository.delete(productId);
    if (deleted) {
      await this.catalogSearchIndexer.removeProductById(productId);
    }

    return { status: deleted ? 'success' : 'not_found', productId };
  }
}

export class UpdateProductUseCase {
  constructor(
    private readonly productRepository: ProductRepositoryLike,
    private readonly catalogSearchIndexer: CatalogSearchIndexerLike
  ) {}

  async execute(input: UpdateProductDto): Promise<{ status: 'success' | 'not_found' | 'not_supported'; productId: string }> {
    if (!this.productRepository.updateDetails) {
      return { status: 'not_supported', productId: input.productId };
    }

    const updated = await this.productRepository.updateDetails(
      input.productId,
      input as unknown as Record<string, unknown>
    );
    if (!updated) {
      return { status: 'not_found', productId: input.productId };
    }

    await this.catalogSearchIndexer.syncProductById(input.productId);
    return { status: 'success', productId: input.productId };
  }
}
