import type { QualityCheckpoint } from '../entities/QualityCheckpoint.entity';
import type { IQualityRepository } from './IQualityRepository';

describe('IQualityRepository contract', () => {
  it('supports save and findByOrderId operations', async () => {
    const checkpoint = { id: 'qc-1', status: 'PASSED' } as unknown as QualityCheckpoint;
    const repository: IQualityRepository = {
      save: jest.fn().mockResolvedValue(checkpoint),
      findByOrderId: jest.fn().mockResolvedValue([checkpoint])
    };

    const saved = await repository.save(checkpoint);
    const found = await repository.findByOrderId('order-1');

    expect(saved).toBe(checkpoint);
    expect(found).toHaveLength(1);
    expect(repository.findByOrderId).toHaveBeenCalledWith('order-1');
  });
});
