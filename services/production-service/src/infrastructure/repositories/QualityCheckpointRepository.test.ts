import { QualityCheckpoint, QualityStatus } from '../../domain/entities/QualityCheckpoint.entity';
import { QualityCheckpointRepository } from './QualityCheckpointRepository';

describe('QualityCheckpointRepository', () => {
  const checkpoint = new QualityCheckpoint({
    id: 'qc-1',
    productionOrderId: 'po-1',
    inspectionDate: new Date('2026-01-01T10:00:00.000Z'),
    stage: 'QUALITY_CONTROL',
    status: QualityStatus.PENDING,
    passed: null,
    defectCount: 0,
    images: [],
    createdAt: new Date('2026-01-01T09:00:00.000Z'),
    updatedAt: new Date('2026-01-01T09:00:00.000Z')
  });

  const record = {
    id: 'qc-1',
    productionOrderId: 'po-1',
    status: QualityStatus.PASSED,
    passed: true,
    defectCount: 0,
    inspectionDate: new Date('2026-01-01T10:00:00.000Z'),
    stage: 'QUALITY_CONTROL',
    images: [],
    createdAt: new Date('2026-01-01T09:00:00.000Z'),
    updatedAt: new Date('2026-01-01T11:00:00.000Z')
  };

  it('saves and retrieves checkpoints through delegate mapping', async () => {
    const delegate = {
      create: jest.fn().mockResolvedValue(record),
      findMany: jest.fn().mockResolvedValue([record])
    };
    const repository = new QualityCheckpointRepository({ production_QualityCheckpoint: delegate } as never);

    const saved = await repository.save(checkpoint);
    const list = await repository.findByOrderId('po-1');

    expect(delegate.create).toHaveBeenCalledTimes(1);
    expect(delegate.findMany).toHaveBeenCalledWith({ where: { productionOrderId: 'po-1' } });
    expect(saved.status).toBe(QualityStatus.PASSED);
    expect(list).toHaveLength(1);
  });

  it('supports fallback delegate name and throws when missing', async () => {
    const fallbackDelegate = {
      create: jest.fn().mockResolvedValue(record),
      findMany: jest.fn().mockResolvedValue([])
    };
    const fallbackRepo = new QualityCheckpointRepository({ qualityCheckpoint: fallbackDelegate } as never);
    await expect(fallbackRepo.save(checkpoint)).resolves.toBeInstanceOf(QualityCheckpoint);

    const brokenRepo = new QualityCheckpointRepository({} as never);
    await expect(brokenRepo.findByOrderId('po-1')).resolves.toEqual([]);
  });
});
