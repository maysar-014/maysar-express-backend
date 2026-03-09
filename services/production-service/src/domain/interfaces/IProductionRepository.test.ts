import type { ProductionPlan } from '../entities/ProductionPlan.entity';
import type { IProductionRepository } from './IProductionRepository';

describe('IProductionRepository contract', () => {
  it('supports save/find/update/delete operations for production plans', async () => {
    const plan = { id: 'plan-1' } as unknown as ProductionPlan;
    const repository: IProductionRepository = {
      save: jest.fn().mockResolvedValue(plan),
      findById: jest.fn().mockResolvedValue(plan),
      findBySupplierId: jest.fn().mockResolvedValue([plan]),
      updateStatus: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined)
    };

    const saved = await repository.save(plan);
    const byId = await repository.findById('plan-1');
    const bySupplier = await repository.findBySupplierId('supplier-1');
    await repository.updateStatus('plan-1', 'IN_PROGRESS');
    await repository.delete('plan-1');

    expect(saved).toBe(plan);
    expect(byId).toBe(plan);
    expect(bySupplier).toHaveLength(1);
    expect(repository.updateStatus).toHaveBeenCalledWith('plan-1', 'IN_PROGRESS');
    expect(repository.delete).toHaveBeenCalledWith('plan-1');
  });
});
