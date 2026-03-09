import type { TrainingRecord } from '../entities/training-record.entity';
import type { ITrainingRecordRepository } from './training-record.repository';

describe('ITrainingRecordRepository contract', () => {
  it('supports save and retrieval methods', async () => {
    const record = { id: 'record-1' } as unknown as TrainingRecord;
    const repository: ITrainingRecordRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue(record),
      findByLearnerId: jest.fn().mockResolvedValue([record]),
      findByModule: jest.fn().mockResolvedValue(record),
      findActive: jest.fn().mockResolvedValue([record]),
      findExpired: jest.fn().mockResolvedValue([record])
    };

    await repository.save(record);
    expect(await repository.findById('record-1')).toBe(record);
    expect((await repository.findByLearnerId('learner-1')).length).toBe(1);
    expect(await repository.findByModule('learner-1', 'module-1')).toBe(record);
    expect((await repository.findActive('learner-1')).length).toBe(1);
    expect((await repository.findExpired()).length).toBe(1);
  });
});
