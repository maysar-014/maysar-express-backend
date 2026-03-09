import { ProductDeletedHandler } from './product-deleted.handler';

describe('ProductDeletedHandler', () => {
  it('removes product from all campaigns and persists updates', async () => {
    const campaign1 = { removeProduct: jest.fn() };
    const campaign2 = { removeProduct: jest.fn() };
    const campaignRepository = {
      findAll: jest.fn().mockResolvedValue([campaign1, campaign2]),
      save: jest.fn().mockResolvedValue(undefined)
    };
    const handler = new ProductDeletedHandler(campaignRepository as never);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    await handler.handle({
      eventType: 'ProductDeleted',
      payload: { productId: 'prod-1' }
    });

    expect(campaignRepository.findAll).toHaveBeenCalledWith({ productId: 'prod-1' });
    expect(campaign1.removeProduct).toHaveBeenCalledWith('prod-1');
    expect(campaign2.removeProduct).toHaveBeenCalledWith('prod-1');
    expect(campaignRepository.save).toHaveBeenCalledTimes(2);
    expect(logSpy).toHaveBeenCalledWith(
      '[ProductDeletedHandler] Processing ProductDeleted: Removing product prod-1 from all campaigns'
    );
  });

  it('throws for event type mismatch', async () => {
    const handler = new ProductDeletedHandler({
      findAll: jest.fn(),
      save: jest.fn()
    } as never);

    await expect(handler.handle({ eventType: 'Wrong', payload: { productId: 'x' } } as never)).rejects.toThrow(
      'Event type mismatch: expected ProductDeleted, got Wrong'
    );
  });
});

