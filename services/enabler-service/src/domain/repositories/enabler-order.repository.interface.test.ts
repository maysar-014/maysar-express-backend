import type { EnablerOrderEntity } from '../entities/enabler-order.entity';
import type { IEnablerOrderRepository } from './enabler-order.repository.interface';

describe('IEnablerOrderRepository contract', () => {
  it('supports enabler order query and persistence operations', async () => {
    const order = { id: 'eo-1' } as unknown as EnablerOrderEntity;
    const repo: IEnablerOrderRepository = {
      findById: jest.fn().mockResolvedValue(order),
      findByEnablerId: jest.fn().mockResolvedValue([order]),
      findByOrderId: jest.fn().mockResolvedValue(order),
      findPendingCommissions: jest.fn().mockResolvedValue([order]),
      save: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined)
    };

    expect(await repo.findById('eo-1')).toBe(order);
    expect((await repo.findByEnablerId('enabler-1')).length).toBe(1);
    expect(await repo.findByOrderId('order-1')).toBe(order);
    expect((await repo.findPendingCommissions()).length).toBe(1);
  });
});
