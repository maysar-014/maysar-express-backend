import { PrismaTrainingRecordRepository } from './prisma-training-record.repository';
import { TrainingRecord } from '../../domain/entities/training-record.entity';
import { TrainingStatus } from '../../domain/value-objects/training-status.value-object';

describe('PrismaTrainingRecordRepository', () => {
  const row = {
    id: 'record-1',
    learnerId: 'learner-1',
    learnerRole: 'COURIER',
    moduleId: 'module-1',
    status: 'IN_PROGRESS',
    startedAt: new Date('2026-03-09T10:00:00.000Z'),
    completedAt: null,
    score: null,
    attempts: 1,
    progress: { percent: 20 },
    expiresAt: null
  };

  it('save performs upsert with mapped persistence payload', async () => {
    const upsert = jest.fn().mockResolvedValue(undefined);
    const repo = new PrismaTrainingRecordRepository({
      trainingRecord: {
        upsert,
        findUnique: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn()
      }
    } as never);

    const record = TrainingRecord.create({
      id: 'record-1',
      learnerId: 'learner-1',
      learnerRole: 'COURIER',
      moduleId: 'module-1',
      status: TrainingStatus.IN_PROGRESS,
      attempts: 1
    });
    await repo.save(record);

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'record-1' },
        create: expect.objectContaining({ learnerId: 'learner-1', status: TrainingStatus.IN_PROGRESS }),
        update: expect.objectContaining({ learnerId: 'learner-1' })
      })
    );
  });

  it('find methods map records and apply filters', async () => {
    const findUnique = jest.fn().mockResolvedValue(row);
    const findMany = jest
      .fn()
      .mockResolvedValueOnce([row])
      .mockResolvedValueOnce([row])
      .mockResolvedValueOnce([row]);
    const findFirst = jest.fn().mockResolvedValue(row);
    const repo = new PrismaTrainingRecordRepository({
      trainingRecord: { upsert: jest.fn(), findUnique, findMany, findFirst }
    } as never);

    const byId = await repo.findById('record-1');
    const byLearner = await repo.findByLearnerId('learner-1');
    const byModule = await repo.findByModule('learner-1', 'module-1');
    const active = await repo.findActive('learner-1');
    const expired = await repo.findExpired();

    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'record-1' } });
    expect(findMany).toHaveBeenNthCalledWith(1, { where: { learnerId: 'learner-1' } });
    expect(findFirst).toHaveBeenCalledWith({ where: { learnerId: 'learner-1', moduleId: 'module-1' } });
    expect(findMany).toHaveBeenNthCalledWith(2, {
      where: { learnerId: 'learner-1', status: { in: ['IN_PROGRESS', 'COMPLETED'] } }
    });
    expect(findMany).toHaveBeenNthCalledWith(3, {
      where: { status: 'COMPLETED', expiresAt: { lt: expect.any(Date) } }
    });
    expect(byId?.id).toBe('record-1');
    expect(byLearner).toHaveLength(1);
    expect(byModule?.moduleId).toBe('module-1');
    expect(active).toHaveLength(1);
    expect(expired).toHaveLength(1);
  });

  it('supports training_TrainingRecord delegate and uses fallbacks when missing', async () => {
    const repoFromNamespaced = new PrismaTrainingRecordRepository({
      training_TrainingRecord: {
        upsert: jest.fn().mockResolvedValue(undefined),
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null)
      }
    } as never);
    const fallbackFromNamespaced = await repoFromNamespaced.findById('missing');
    expect(fallbackFromNamespaced?.id).toBe('missing');
    expect(fallbackFromNamespaced?.learnerId).toBe('learner-default');
    expect(fallbackFromNamespaced?.status).toBe(TrainingStatus.NOT_STARTED);

    const repoWithoutDelegate = new PrismaTrainingRecordRepository({} as never);
    const fallbackWithoutDelegate = await repoWithoutDelegate.findById('x');
    expect(fallbackWithoutDelegate?.id).toBe('x');
    expect(fallbackWithoutDelegate?.status).toBe(TrainingStatus.NOT_STARTED);
  });
});

