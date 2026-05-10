import {
  DeleteProductUseCase,
  PublishProductUseCase,
  UpdateProductUseCase
} from '../manage-product-indexing.use-case';

describe('manage-product-indexing use cases', () => {
  const mockCatalogSearchIndexer = {
    syncProductById: jest.fn(),
    removeProductById: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PublishProductUseCase', () => {
    it('publishes and syncs the search document', async () => {
      const productRepository = {
        findById: jest.fn().mockResolvedValue({ id: 'prod-1' }),
        updateStatus: jest.fn().mockResolvedValue({ id: 'prod-1', status: 'published' }),
        delete: jest.fn()
      };
      mockCatalogSearchIndexer.syncProductById.mockResolvedValue('indexed');

      const useCase = new PublishProductUseCase(productRepository, mockCatalogSearchIndexer);
      const result = await useCase.execute('prod-1');

      expect(result).toEqual({ status: 'success', productId: 'prod-1' });
      expect(productRepository.updateStatus).toHaveBeenCalledWith('prod-1', 'published');
      expect(mockCatalogSearchIndexer.syncProductById).toHaveBeenCalledWith('prod-1');
    });

    it('returns not_found when the product does not exist', async () => {
      const productRepository = {
        findById: jest.fn().mockResolvedValue(null),
        updateStatus: jest.fn(),
        delete: jest.fn()
      };

      const useCase = new PublishProductUseCase(productRepository, mockCatalogSearchIndexer);
      const result = await useCase.execute('missing');

      expect(result).toEqual({ status: 'not_found', productId: 'missing' });
      expect(productRepository.updateStatus).not.toHaveBeenCalled();
      expect(mockCatalogSearchIndexer.syncProductById).not.toHaveBeenCalled();
    });
  });

  describe('DeleteProductUseCase', () => {
    it('deletes and removes the search document', async () => {
      const productRepository = {
        findById: jest.fn().mockResolvedValue({ id: 'prod-1' }),
        updateStatus: jest.fn(),
        delete: jest.fn().mockResolvedValue(true)
      };
      mockCatalogSearchIndexer.removeProductById.mockResolvedValue(undefined);

      const useCase = new DeleteProductUseCase(productRepository, mockCatalogSearchIndexer);
      const result = await useCase.execute('prod-1');

      expect(result).toEqual({ status: 'success', productId: 'prod-1' });
      expect(productRepository.delete).toHaveBeenCalledWith('prod-1');
      expect(mockCatalogSearchIndexer.removeProductById).toHaveBeenCalledWith('prod-1');
    });
  });

  describe('UpdateProductUseCase', () => {
    it('updates and syncs the search document', async () => {
      const productRepository = {
        findById: jest.fn(),
        updateStatus: jest.fn(),
        delete: jest.fn(),
        updateDetails: jest.fn().mockResolvedValue({ id: 'prod-1' })
      };
      mockCatalogSearchIndexer.syncProductById.mockResolvedValue('indexed');

      const useCase = new UpdateProductUseCase(productRepository, mockCatalogSearchIndexer);
      const result = await useCase.execute({
        productId: 'prod-1',
        name: 'Updated product',
        price: 12345
      } as any);

      expect(result).toEqual({ status: 'success', productId: 'prod-1' });
      expect(productRepository.updateDetails).toHaveBeenCalledWith('prod-1', expect.objectContaining({
        productId: 'prod-1',
        name: 'Updated product',
        price: 12345
      }));
      expect(mockCatalogSearchIndexer.syncProductById).toHaveBeenCalledWith('prod-1');
    });
  });
});
