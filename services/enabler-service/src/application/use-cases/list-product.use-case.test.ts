jest.mock('@shared/ids/id', () => {
  const actual = jest.requireActual('@shared/ids/id');
  return {
    ...actual,
    makeId: jest.fn(() => 'enb_prolis_01H00000000000000000000000')
  };
});

import { ListProductUseCase } from './list-product.use-case';
import { makeId } from '@shared/ids/id';

describe('ListProductUseCase', () => {
  const baseDto = {
    productId: 'product-1',
    customPrice: undefined,
    priceMarkup: undefined,
    visibility: true,
    minOrderQuantity: 1,
    deliveryTimeframe: '2-3 days',
    returnPolicy: 'standard',
    warrantyPeriod: 30
  };

  const baseEnabler = {
    id: 'enabler-1',
    tier: 'BRONZE',
    status: 'ACTIVE',
    canListProducts: jest.fn(() => true)
  };

  const baseProduct = {
    id: 'product-1',
    sellerId: 'seller-1',
    price: 100,
    status: 'published',
    seller: {
      allowsEnablers: true,
      blockedEnablers: [],
      requiresApproval: false
    }
  };

  const makeDeps = () => {
    const enablerRepository = { findById: jest.fn() };
    const listingRepository = { findByEnablerId: jest.fn(), save: jest.fn() };
    const catalogService = { getProduct: jest.fn() };
    const eventPublisher = { publish: jest.fn() };

    return { enablerRepository, listingRepository, catalogService, eventPublisher };
  };

  it('throws when enabler cannot be found', async () => {
    const deps = makeDeps();
    deps.enablerRepository.findById.mockResolvedValue(null);
    const useCase = new ListProductUseCase(
      deps.enablerRepository as never,
      deps.listingRepository as never,
      deps.catalogService,
      deps.eventPublisher
    );

    await expect(useCase.execute('enabler-x', baseDto)).rejects.toThrow('Enabler not found');
  });

  it('throws when enabler is not eligible to list products', async () => {
    const deps = makeDeps();
    deps.enablerRepository.findById.mockResolvedValue({
      ...baseEnabler,
      canListProducts: jest.fn(() => false)
    });
    const useCase = new ListProductUseCase(
      deps.enablerRepository as never,
      deps.listingRepository as never,
      deps.catalogService,
      deps.eventPublisher
    );

    await expect(useCase.execute('enabler-1', baseDto)).rejects.toThrow(
      'Enabler is not eligible to list products'
    );
  });

  it('throws when catalog product cannot be found', async () => {
    const deps = makeDeps();
    deps.enablerRepository.findById.mockResolvedValue(baseEnabler);
    deps.catalogService.getProduct.mockResolvedValue(null);
    const useCase = new ListProductUseCase(
      deps.enablerRepository as never,
      deps.listingRepository as never,
      deps.catalogService,
      deps.eventPublisher
    );

    await expect(useCase.execute('enabler-1', baseDto)).rejects.toThrow('Product not found');
  });

  it('throws when listing policy rejects enabler/product context', async () => {
    const deps = makeDeps();
    deps.enablerRepository.findById.mockResolvedValue({
      ...baseEnabler,
      status: 'SUSPENDED',
      canListProducts: jest.fn(() => true)
    });
    deps.catalogService.getProduct.mockResolvedValue(baseProduct);
    deps.listingRepository.findByEnablerId.mockResolvedValue([]);
    const useCase = new ListProductUseCase(
      deps.enablerRepository as never,
      deps.listingRepository as never,
      deps.catalogService,
      deps.eventPublisher
    );

    await expect(useCase.execute('enabler-1', baseDto)).rejects.toThrow(
      'Cannot list product: Enabler is not active'
    );
  });

  it('throws for invalid custom pricing configuration', async () => {
    const deps = makeDeps();
    deps.enablerRepository.findById.mockResolvedValue(baseEnabler);
    deps.catalogService.getProduct.mockResolvedValue(baseProduct);
    deps.listingRepository.findByEnablerId.mockResolvedValue([]);
    const useCase = new ListProductUseCase(
      deps.enablerRepository as never,
      deps.listingRepository as never,
      deps.catalogService,
      deps.eventPublisher
    );

    await expect(
      useCase.execute('enabler-1', { ...baseDto, customPrice: 90 })
    ).rejects.toThrow('Invalid pricing configuration');
  });

  it('creates listing, persists entity, and publishes ProductListedEvent', async () => {
    const deps = makeDeps();
    (makeId as jest.Mock).mockReturnValue('enb_prolis_01H00000000000000000000000');
    deps.enablerRepository.findById.mockResolvedValue(baseEnabler);
    deps.catalogService.getProduct.mockResolvedValue(baseProduct);
    deps.listingRepository.findByEnablerId.mockResolvedValue([]);
    deps.listingRepository.save.mockResolvedValue(undefined);
    deps.eventPublisher.publish.mockResolvedValue(undefined);
    const useCase = new ListProductUseCase(
      deps.enablerRepository as never,
      deps.listingRepository as never,
      deps.catalogService,
      deps.eventPublisher
    );

    const result = await useCase.execute('enabler-1', {
      ...baseDto,
      customPrice: 120
    });

    expect(deps.listingRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'enb_prolis_01H00000000000000000000000',
        enablerId: 'enabler-1',
        productId: 'product-1'
      })
    );
    expect(deps.eventPublisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        listingId: 'enb_prolis_01H00000000000000000000000',
        enablerId: 'enabler-1',
        productId: 'product-1'
      })
    );
    expect(result.id).toBe('enb_prolis_01H00000000000000000000000');
    expect(result.sellerId).toBe('seller-1');
    expect(result.customPrice).toBe(120);
  });
});

