import { ProductionMetricsRepository } from './ProductionMetricsRepository';

describe('ProductionMetricsRepository', () => {
  it('saves mapped metrics fields through configured delegate', async () => {
    const create = jest.fn().mockResolvedValue(undefined);
    const repository = new ProductionMetricsRepository({
      production_Metrics: { create }
    } as never);

    await repository.save({
      id: 'm-1',
      productionOrderId: 'order-1',
      leadTime: { toHours: () => 2.5 },
      qualityScore: { defectRate: 0.03 }
    } as never);

    expect(create).toHaveBeenCalledWith({
      data: {
        id: 'm-1',
        productionOrderId: 'order-1',
        leadTimeSeconds: 9000,
        defectRate: 0.03
      }
    });
  });

  it('supports alternate delegate name and nulls optional metrics', async () => {
    const create = jest.fn().mockResolvedValue(undefined);
    const repository = new ProductionMetricsRepository({
      productionMetrics: { create }
    } as never);

    await repository.save({
      id: 'm-2',
      productionOrderId: 'order-2',
      leadTime: undefined,
      qualityScore: undefined
    } as never);

    expect(create).toHaveBeenCalledWith({
      data: {
        id: 'm-2',
        productionOrderId: 'order-2',
        leadTimeSeconds: null,
        defectRate: null
      }
    });
  });

  it('throws clear error when metrics delegate is missing', async () => {
    const repository = new ProductionMetricsRepository({} as never);

    await expect(
      repository.save({ id: 'm-3', productionOrderId: 'order-3' } as never)
    ).rejects.toThrow('Production metrics delegate is not configured on prisma client');
  });
});

