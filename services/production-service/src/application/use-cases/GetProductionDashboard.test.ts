import { GetProductionDashboard } from './GetProductionDashboard';

describe('GetProductionDashboard', () => {
  it('returns active plan count for supplier', async () => {
    const planRepo = {
      findBySupplierId: jest.fn().mockResolvedValue([{ id: 'p1' }, { id: 'p2' }])
    };
    const orderRepo = {};
    const useCase = new GetProductionDashboard(planRepo as never, orderRepo as never);

    const result = await useCase.execute('supplier-1');

    expect(planRepo.findBySupplierId).toHaveBeenCalledWith('supplier-1');
    expect(result).toEqual({ activePlans: 2 });
  });
});
