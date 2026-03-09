import { ProductListingSaga } from './product-listing.saga';

describe('ProductListingSaga', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists published product and optionally notifies seller', async () => {
    const listProductUseCase = {
      execute: jest.fn().mockResolvedValue({ id: 'listing-1' })
    };
    const notificationService = {
      sendNotification: jest.fn().mockResolvedValue(undefined)
    };
    const catalogService = {
      getProduct: jest.fn().mockResolvedValue({
        status: 'published',
        sellerId: 'seller-1',
        title: 'Sample Product',
        seller: { settings: { notifyOnEnablerListing: true } }
      })
    };
    const saga = new ProductListingSaga(listProductUseCase as never, notificationService, catalogService);

    await saga.execute('enabler-1', { productId: 'product-1' });

    expect(catalogService.getProduct).toHaveBeenCalledWith('product-1');
    expect(listProductUseCase.execute).toHaveBeenCalledWith('enabler-1', { productId: 'product-1' });
    expect(notificationService.sendNotification).toHaveBeenCalledWith(
      'seller-1',
      'Enabler enabler-1 listed your product Sample Product'
    );
  });

  it('throws for unpublished product and logs failure', async () => {
    const listProductUseCase = {
      execute: jest.fn()
    };
    const notificationService = {
      sendNotification: jest.fn()
    };
    const catalogService = {
      getProduct: jest.fn().mockResolvedValue({
        status: 'draft',
        seller: { settings: { notifyOnEnablerListing: false } }
      })
    };
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const saga = new ProductListingSaga(listProductUseCase as never, notificationService, catalogService);

    await expect(saga.execute('enabler-2', { productId: 'product-2' })).rejects.toThrow('Product is not published');
    expect(listProductUseCase.execute).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith('Product Listing Saga Failed:', expect.any(Error));
  });
});

