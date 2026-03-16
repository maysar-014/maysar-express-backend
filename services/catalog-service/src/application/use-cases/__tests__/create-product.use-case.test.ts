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
    supplierLocation: 'Dar es Salaam',
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
    const mockIdGenerator = {
      generate: jest.fn()
        .mockReturnValueOnce('event-1')
        .mockReturnValueOnce('event-2')
    };
    const mockDateTimeService = {
      now: jest.fn().mockReturnValue(new Date('2026-01-01T00:00:00.000Z'))
    };

    const useCase = new CreateProductUseCase(
      mockProductRepository,
      mockCategoryRepository,
      mockCategoryAttributeRepository,
      {},
      mockEventPublisher,
      mockIdGenerator,
      mockDateTimeService
    );

    const result = await useCase.execute(buildDto());

    expect(result.status).toBe('success');
    expect(isSystemId(result.productId)).toBe(true);
    expect(mockProductRepository.saveWithAttributesTransaction).toHaveBeenCalled();
    expect(mockEventPublisher.publish).toHaveBeenCalledTimes(2);
    expect(mockIdGenerator.generate).toHaveBeenCalledTimes(2);
  });

  it('returns validation error when category is missing', async () => {
    const useCase = new CreateProductUseCase(
      { saveWithAttributesTransaction: jest.fn() },
      { findById: jest.fn().mockResolvedValue(null) },
      { findByCategory: jest.fn() },
      {},
      { publish: jest.fn() },
      { generate: jest.fn().mockReturnValue('id-1') },
      { now: jest.fn().mockReturnValue(new Date()) }
    );

    const result = await useCase.execute(buildDto());

    expect(result.status).toBe('validation_error');
    expect(result.violations).toContain('Category not found');
  });
});
