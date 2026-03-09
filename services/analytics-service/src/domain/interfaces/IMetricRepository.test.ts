import type { Metric } from '../entities/Metric.entity';
import type { IMetricRepository } from './IMetricRepository';

describe('IMetricRepository contract', () => {
  it('supports save/findByPeriod/getLatest signatures', async () => {
    const metric = { id: 'm1' } as unknown as Metric;
    const repo: IMetricRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      findByPeriod: jest.fn().mockResolvedValue([metric]),
      getLatest: jest.fn().mockResolvedValue(metric)
    };

    await repo.save(metric);
    const period = await repo.findByPeriod('sales', 'seller:1', new Date('2026-03-01'), new Date('2026-03-08'));
    const latest = await repo.getLatest('sales', 'seller:1');

    expect(period).toHaveLength(1);
    expect(latest).toBe(metric);
  });
});
