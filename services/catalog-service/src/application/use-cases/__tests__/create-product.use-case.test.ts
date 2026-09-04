import { CreateProductUseCase } from '../create-product.use-case';
import { StructuredCreateProductDto } from '../../dto/product.dto';
import { isSystemId } from '@shared/ids/id';

describe('CreateProductUseCase', () => {
  const buildDto = (): StructuredCreateProductDto => ({
    sellerId: 'seller-1',
    categoryId: 'cat-1',
    brand: 'Acme',
    productName: 'Acme Blender',
    minimumOrderQuantity: 1,
    supplierLocationId: 'addr-1',
    structuredAttributes: {
      color: 'Black',
      material: 'Steel'
    },
    mediaUrls: ['img-1', 'img-2', 'img-3'],
    price: 120000,
    currency: 'TZS'
  });

  it('creates product successfully and publishes two events', async () => {
    const mockProductRepository = {
      saveWithAttributesTransaction: jest.fn().mockResolvedValue(undefined)
    };
    const mockCategoryRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'cat-1',
        name: 'Kitchen',
        slug: 'kitchen'
      })
    };
    const mockCategoryAttributeRepository = {
      findByCategory: jest.fn().mockResolvedValue([
        { id: 'attr-1', name: 'color', displayLabel: 'Color', type: 'TEXT', options: null, isRequired: true, placeholder: null },
        { id: 'attr-2', name: 'material', displayLabel: 'Material', type: 'TEXT', options: null, isRequired: true, placeholder: null }
      ])
    };
    const mockEventPublisher = {
      publish: jest.fn().mockResolvedValue(undefined)
    };
    const mockSellerLocationRepository = {
      findByIdForSeller: jest.fn().mockResolvedValue({
        id: 'addr-1',
        sellerId: 'seller-1',
        businessId: 'biz-1',
        city: 'Dar es Salaam',
        region: 'Dar es Salaam',
        country: 'Tanzania',
        displayName: 'Dar es Salaam',
        isPrimary: true
      })
    };
    const mockIdGenerator = {
      generate: jest.fn()
        .mockReturnValueOnce('event-1')
        .mockReturnValueOnce('event-2')
    };
    const mockDateTimeService = {
      now: jest.fn().mockReturnValue(new Date('2026-01-01T00:00:00.000Z'))
    };
    const mockCatalogSearchIndexer = {
      syncProductById: jest.fn().mockResolvedValue('indexed')
    };

    const useCase = new CreateProductUseCase(
      mockProductRepository,
      mockCategoryRepository,
      mockCategoryAttributeRepository,
      {},
      mockSellerLocationRepository,
      mockEventPublisher,
      mockIdGenerator,
      mockDateTimeService,
      mockCatalogSearchIndexer
    );

    const result = await useCase.execute(buildDto());

    expect(result.status).toBe('success');
    expect(isSystemId(result.productId)).toBe(true);
    expect(mockProductRepository.saveWithAttributesTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        supplierLocationId: 'addr-1',
        supplierLocation: 'Dar es Salaam'
      }),
      result.productId,
      expect.any(Array)
    );
    expect(mockEventPublisher.publish).toHaveBeenCalledTimes(2);
    expect(mockIdGenerator.generate).toHaveBeenCalledTimes(2);
    expect(mockCatalogSearchIndexer.syncProductById).toHaveBeenCalledWith(result.productId);
  });

  it('returns validation error when category is missing', async () => {
    const useCase = new CreateProductUseCase(
      { saveWithAttributesTransaction: jest.fn() },
      { findById: jest.fn().mockResolvedValue(null) },
      { findByCategory: jest.fn() },
      {},
      { findByIdForSeller: jest.fn().mockResolvedValue({
        id: 'addr-1',
        sellerId: 'seller-1',
        businessId: 'biz-1',
        city: 'Dar es Salaam',
        region: 'Dar es Salaam',
        country: 'Tanzania',
        displayName: 'Dar es Salaam',
        isPrimary: true
      }) },
      { publish: jest.fn() },
      { generate: jest.fn().mockReturnValue('id-1') },
      { now: jest.fn().mockReturnValue(new Date()) }
    );

    const result = await useCase.execute(buildDto());

    expect(result.status).toBe('validation_error');
    expect(result.violations).toContain('Category not found');
  });

  it('returns validation error when supplier location ID is missing', async () => {
    const useCase = new CreateProductUseCase(
      { saveWithAttributesTransaction: jest.fn() },
      { findById: jest.fn() },
      { findByCategory: jest.fn() },
      {},
      { findByIdForSeller: jest.fn() },
      { publish: jest.fn() },
      { generate: jest.fn().mockReturnValue('id-1') },
      { now: jest.fn().mockReturnValue(new Date()) }
    );

    const result = await useCase.execute({
      ...buildDto(),
      supplierLocationId: '   '
    });

    expect(result.status).toBe('validation_error');
    expect(result.violations).toContain('Supplier location is required');
  });

  it('returns validation error when saved supplier location does not belong to seller', async () => {
    const useCase = new CreateProductUseCase(
      { saveWithAttributesTransaction: jest.fn() },
      { findById: jest.fn().mockResolvedValue({ id: 'cat-1', name: 'Kitchen', slug: 'kitchen' }) },
      { findByCategory: jest.fn().mockResolvedValue([]) },
      {},
      { findByIdForSeller: jest.fn().mockResolvedValue(null) },
      { publish: jest.fn() },
      { generate: jest.fn().mockReturnValue('id-1') },
      { now: jest.fn().mockReturnValue(new Date()) }
    );

    const result = await useCase.execute(buildDto());

    expect(result.status).toBe('validation_error');
    expect(result.violations).toContain('Saved supplier location not found for seller');
  });
});
