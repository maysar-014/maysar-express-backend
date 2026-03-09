import { CategoryDeletedHandler } from './category-deleted.handler';

describe('CategoryDeletedHandler', () => {
  it('removes category from all campaigns and persists each campaign', async () => {
    const campaign1 = { removeCategory: jest.fn() };
    const campaign2 = { removeCategory: jest.fn() };
    const campaignRepository = {
      findAll: jest.fn().mockResolvedValue([campaign1, campaign2]),
      save: jest.fn().mockResolvedValue(undefined)
    };
    const handler = new CategoryDeletedHandler(campaignRepository as never);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    await handler.handle({
      eventType: 'CategoryDeleted',
      payload: { categoryId: 'cat-1' }
    });

    expect(campaignRepository.findAll).toHaveBeenCalledWith({ categoryId: 'cat-1' });
    expect(campaign1.removeCategory).toHaveBeenCalledWith('cat-1');
    expect(campaign2.removeCategory).toHaveBeenCalledWith('cat-1');
    expect(campaignRepository.save).toHaveBeenCalledTimes(2);
    expect(logSpy).toHaveBeenCalledWith(
      '[CategoryDeletedHandler] Processing CategoryDeleted: Removing category cat-1 from all campaigns'
    );
  });

  it('throws when event structure is invalid', async () => {
    const handler = new CategoryDeletedHandler({
      findAll: jest.fn(),
      save: jest.fn()
    } as never);

    await expect(handler.handle({ eventType: 'WrongType', payload: { categoryId: 'cat-1' } } as never)).rejects.toThrow(
      'Event type mismatch: expected CategoryDeleted, got WrongType'
    );
  });
});

