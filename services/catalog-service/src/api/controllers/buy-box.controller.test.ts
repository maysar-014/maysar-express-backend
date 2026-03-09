import { BuyBoxController } from './buy-box.controller';

const makeRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('BuyBoxController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getBuyBox returns 404, 200, or 500 depending on repository result', async () => {
    const repo = { findByProductId: jest.fn() };
    const controller = new BuyBoxController({ execute: jest.fn() } as never, repo as never);

    repo.findByProductId.mockResolvedValueOnce(null);
    const notFoundRes = makeRes();
    await controller.getBuyBox({ params: { productId: 'p1' } } as never, notFoundRes);
    expect(notFoundRes.status).toHaveBeenCalledWith(404);

    repo.findByProductId.mockResolvedValueOnce({
      productId: 'p1',
      primarySellerId: 's1',
      primaryScore: 88,
      alternatives: [],
      computedAt: new Date('2026-03-09T13:00:00.000Z')
    });
    const okRes = makeRes();
    await controller.getBuyBox({ params: { productId: 'p1' } } as never, okRes);
    expect(okRes.status).toHaveBeenCalledWith(200);
    expect(okRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 'p1',
        primarySellerId: 's1'
      })
    );

    repo.findByProductId.mockRejectedValueOnce(new Error('repo-failed'));
    const errRes = makeRes();
    await controller.getBuyBox({ params: { productId: 'p1' } } as never, errRes);
    expect(errRes.status).toHaveBeenCalledWith(500);
  });

  it('triggerCompute validates listings and returns compute result', async () => {
    const computeUseCase = { execute: jest.fn().mockResolvedValue({ productId: 'p2' }) };
    const controller = new BuyBoxController(computeUseCase as never, { findByProductId: jest.fn() } as never);

    const badReqRes = makeRes();
    await controller.triggerCompute(
      { params: { productId: 'p2' }, body: {} } as never,
      badReqRes
    );
    expect(badReqRes.status).toHaveBeenCalledWith(400);

    const okRes = makeRes();
    await controller.triggerCompute(
      { params: { productId: 'p2' }, body: { listings: [{ sellerId: 's1' }] } } as never,
      okRes
    );
    expect(computeUseCase.execute).toHaveBeenCalledWith({
      productId: 'p2',
      listings: [{ sellerId: 's1' }]
    });
    expect(okRes.status).toHaveBeenCalledWith(200);
    expect(okRes.json).toHaveBeenCalledWith({ productId: 'p2' });
  });
});

