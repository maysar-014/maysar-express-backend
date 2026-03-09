import { ProductListingController } from './product-listing.controller';

const makeRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('ProductListingController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('listProduct returns 201 with created listing or 400 on failure', async () => {
    const listProductUseCase = {
      execute: jest.fn().mockResolvedValue({ id: 'listing-1' })
    };
    const controller = new ProductListingController(listProductUseCase as never, {} as never);

    const successReq: any = { params: { enablerId: 'en-1' }, body: { productId: 'p1' } };
    const successRes = makeRes();
    await controller.listProduct(successReq, successRes);
    expect(listProductUseCase.execute).toHaveBeenCalledWith('en-1', { productId: 'p1' });
    expect(successRes.status).toHaveBeenCalledWith(201);

    listProductUseCase.execute.mockRejectedValue(new Error('bad request'));
    const errorRes = makeRes();
    await controller.listProduct(successReq, errorRes);
    expect(errorRes.status).toHaveBeenCalledWith(400);
    expect(errorRes.json).toHaveBeenCalledWith({ error: 'bad request' });
  });

  it('getListings and getHubProducts return expected payloads', async () => {
    const listingRepository = {
      findByEnablerId: jest.fn().mockResolvedValue([
        { toPlainObject: () => ({ id: 'l1' }) },
        { toPlainObject: () => ({ id: 'l2' }) }
      ])
    };
    const controller = new ProductListingController({ execute: jest.fn() } as never, listingRepository);

    const listReq: any = { params: { enablerId: 'en-2' } };
    const listRes = makeRes();
    await controller.getListings(listReq, listRes);
    expect(listRes.status).toHaveBeenCalledWith(200);
    expect(listRes.json).toHaveBeenCalledWith([{ id: 'l1' }, { id: 'l2' }]);

    const hubRes = makeRes();
    await controller.getHubProducts({} as never, hubRes);
    expect(hubRes.status).toHaveBeenCalledWith(200);
    expect(hubRes.json).toHaveBeenCalledWith({ message: 'Hub products endpoint' });
  });
});

