import { EnablerOrderController } from './enabler-order.controller';

const makeRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('EnablerOrderController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('createOrder uses path enablerId and returns success/error responses', async () => {
    const facilitateOrderUseCase = {
      execute: jest.fn().mockResolvedValue({ id: 'order-1' })
    };
    const controller = new EnablerOrderController(
      facilitateOrderUseCase as never,
      { execute: jest.fn() } as never,
      {} as never
    );

    const req: any = { body: { productId: 'p1' }, params: { enablerId: 'en-1' } };
    const res = makeRes();
    await controller.createOrder(req, res);

    expect(facilitateOrderUseCase.execute).toHaveBeenCalledWith({ productId: 'p1', enablerId: 'en-1' });
    expect(res.status).toHaveBeenCalledWith(201);

    facilitateOrderUseCase.execute.mockRejectedValue(new Error('invalid order'));
    const errorRes = makeRes();
    await controller.createOrder(req, errorRes);
    expect(errorRes.status).toHaveBeenCalledWith(400);
    expect(errorRes.json).toHaveBeenCalledWith({ error: 'invalid order' });
  });

  it('getOrders and getCommissionBreakdown return mapped responses', async () => {
    const orderRepository = {
      findByEnablerId: jest.fn().mockResolvedValue([
        { toPlainObject: () => ({ id: 'o1' }) }
      ])
    };
    const commissionUseCase = {
      execute: jest.fn().mockResolvedValue({ totalCommission: 1000 })
    };
    const controller = new EnablerOrderController(
      { execute: jest.fn() } as never,
      commissionUseCase as never,
      orderRepository
    );

    const ordersRes = makeRes();
    await controller.getOrders({ params: { enablerId: 'en-2' } } as never, ordersRes);
    expect(ordersRes.status).toHaveBeenCalledWith(200);
    expect(ordersRes.json).toHaveBeenCalledWith([{ id: 'o1' }]);

    const commissionRes = makeRes();
    await controller.getCommissionBreakdown({ params: { orderId: 'ord-1' } } as never, commissionRes);
    expect(commissionUseCase.execute).toHaveBeenCalledWith('ord-1');
    expect(commissionRes.status).toHaveBeenCalledWith(200);
    expect(commissionRes.json).toHaveBeenCalledWith({ totalCommission: 1000 });
  });
});

