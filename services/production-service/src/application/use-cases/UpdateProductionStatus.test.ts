import { UpdateProductionStatus } from './UpdateProductionStatus';
import { ProductionStatus } from '../../domain/entities/ProductionPlan.entity';

describe('UpdateProductionStatus', () => {
  it('updates status and saves plan', async () => {
    const plan = { updateStatus: jest.fn() };
    const repo = {
      findById: jest.fn().mockResolvedValue(plan),
      save: jest.fn().mockResolvedValue(undefined)
    };
    const useCase = new UpdateProductionStatus(repo as never);

    await useCase.execute('plan-1', ProductionStatus.IN_PROGRESS);

    expect(repo.findById).toHaveBeenCalledWith('plan-1');
    expect(plan.updateStatus).toHaveBeenCalledWith(ProductionStatus.IN_PROGRESS);
    expect(repo.save).toHaveBeenCalledWith(plan);
  });

  it('throws when plan is not found', async () => {
    const repo = {
      findById: jest.fn().mockResolvedValue(null),
      save: jest.fn()
    };
    const useCase = new UpdateProductionStatus(repo as never);

    await expect(useCase.execute('missing', ProductionStatus.CANCELLED)).rejects.toThrow(
      'Plan not found'
    );
  });
});
