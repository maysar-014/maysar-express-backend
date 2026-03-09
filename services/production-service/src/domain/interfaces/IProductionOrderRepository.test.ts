import type { ProductionOrder } from '../entities/ProductionOrder.entity';
import type { IProductionOrderRepository } from './IProductionOrderRepository';

describe('IProductionOrderRepository contract', () => {
  it('supports save/find/update operations for production orders', async () => {
    const order = { id: 'prod-order-1' } as unknown as ProductionOrder;
    const repository: IProductionOrderRepository = {
      save: jest.fn().mockResolvedValue(order),
      findById: jest.fn().mockResolvedValue(order),
      findByPlanId: jest.fn().mockResolvedValue([order]),
      updateStatus: jest.fn().mockResolvedValue(undefined)
    };

    const saved = await repository.save(order);
    const byId = await repository.findById('prod-order-1');
    const byPlan = await repository.findByPlanId('plan-1');
    await repository.updateStatus('prod-order-1', 'COMPLETED');

    expect(saved).toBe(order);
    expect(byId).toBe(order);
    expect(byPlan).toHaveLength(1);
    expect(repository.updateStatus).toHaveBeenCalledWith('prod-order-1', 'COMPLETED');
  });
});
