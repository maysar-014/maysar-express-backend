import { CatalogSearchIndexer } from './catalog-search-indexer.service';

const buildPrismaMock = () => ({
  product: {
    findMany: jest.fn(),
  },
});

const buildSearchServiceMock = () => ({
  index: jest.fn().mockResolvedValue(undefined),
  remove: jest.fn().mockResolvedValue(undefined),
  search: jest.fn(),
  update: jest.fn(),
});

describe('CatalogSearchIndexer', () => {
  it('indexes, removes, and skips products by id', async () => {
    const prisma = buildPrismaMock();
    const searchService = buildSearchServiceMock();

    prisma.product.findMany.mockResolvedValueOnce([
      {
        id: 'product-1',
        sellerId: 'seller-1',
        title: 'Phone',
        description: 'A nice phone',
        categoryId: 'electronics',
        supplierLocationId: 'loc-1',
        supplierLocation: 'Dar es Salaam',
        brand: 'BrandX',
        tags: ['phones'],
        status: 'published',
        visibility: 'public',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        seoMetadata: { currency: 'USD' },
        variants: [{ price: '125.50', status: 'active', attributes: { currency: 'USD' } }],
      },
    ]);
    prisma.product.findMany.mockResolvedValueOnce([]);
    prisma.product.findMany.mockResolvedValueOnce([
      {
        id: 'product-1',
        sellerId: 'seller-1',
        title: 'Phone',
        description: 'A nice phone',
        categoryId: 'electronics',
        supplierLocationId: 'loc-1',
        supplierLocation: 'Dar es Salaam',
        brand: 'BrandX',
        tags: ['phones'],
        status: 'published',
        visibility: 'public',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        seoMetadata: {},
        variants: [{ price: '125.50', status: 'active', attributes: {} }],
      },
      {
        id: 'product-2',
        sellerId: 'seller-2',
        title: 'Draft Item',
        description: 'Hidden product',
        categoryId: 'electronics',
        supplierLocationId: null,
        supplierLocation: null,
        brand: null,
        tags: [],
        status: 'draft',
        visibility: 'private',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        seoMetadata: {},
        variants: [],
      },
    ]);
    prisma.product.findMany.mockResolvedValueOnce([]);

    const indexer = new CatalogSearchIndexer(prisma as never, searchService as never, 'catalog-index');

    await expect(indexer.syncProductById('product-1')).resolves.toBe('indexed');
    await expect(indexer.syncProductById('missing')).resolves.toBe('removed');
    await expect(indexer.syncProductIds(['product-1', 'product-1', 'product-2', 'missing'], 2)).resolves.toEqual({
      indexed: 1,
      removed: 1,
      skipped: 1,
    });

    expect(searchService.index).toHaveBeenCalledWith(expect.objectContaining({
      id: 'product-1',
      name: 'Phone',
      currency: 'USD',
      price: 125.5,
      supplierLocationId: 'loc-1',
    }));
    expect(searchService.remove).toHaveBeenCalledWith('missing');
    expect(searchService.remove).toHaveBeenCalledWith('product-2');
  });

  it('reindexes published products through the search provider bulk path', async () => {
    const prisma = buildPrismaMock();
    const searchService = buildSearchServiceMock();
    const searchProvider = {
      bulkIndex: jest.fn().mockResolvedValue(undefined),
    };

    prisma.product.findMany.mockResolvedValue([
      {
        id: 'product-1',
        sellerId: 'seller-1',
        title: 'Phone',
        description: 'A nice phone',
        categoryId: 'electronics',
        supplierLocationId: 'loc-1',
        supplierLocation: 'Dar es Salaam',
        brand: 'BrandX',
        tags: ['phones'],
        status: 'published',
        visibility: 'public',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        seoMetadata: {},
        variants: [{ price: '125.50', status: 'active', attributes: {} }],
      },
    ]);

    const indexer = new CatalogSearchIndexer(prisma as never, searchService as never, 'catalog-index', searchProvider as never);

    await expect(indexer.reindexPublishedProducts(10, 100)).resolves.toEqual({
      indexed: 1,
      removed: 0,
      skipped: 0,
    });

    expect(searchProvider.bulkIndex).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'product-1',
        index: 'catalog-index',
        data: expect.objectContaining({
          id: 'product-1',
          name: 'Phone',
        }),
      }),
    ]);
  });
});
