import { TrainingRecordMapper } from './training-record.mapper';
import { TrainingRecord } from '../../domain/entities/training-record.entity';
import { TrainingScore } from '../../domain/value-objects/training-score.value-object';
import { TrainingStatus } from '../../domain/value-objects/training-status.value-object';

describe('TrainingRecordMapper', () => {
  it('maps domain training record to dto and persistence object', () => {
    const record = TrainingRecord.create({
      id: 'record-10',
      learnerId: 'learner-10',
      learnerRole: 'courier',
      moduleId: 'module-20',
      status: TrainingStatus.COMPLETED,
      startedAt: new Date('2026-03-08T00:00:00.000Z'),
      completedAt: new Date('2026-03-08T01:00:00.000Z'),
      score: TrainingScore.create(92),
      attempts: 1,
      progress: { completionPercentage: 100 },
      expiresAt: new Date('2027-03-08T01:00:00.000Z')
    });

    const dto = TrainingRecordMapper.toDTO(record);
    const persistence = TrainingRecordMapper.toPersistence(record);

    expect(dto.score).toBe(92);
    expect(dto.status).toBe(TrainingStatus.COMPLETED);
    expect(persistence.learnerId).toBe('learner-10');
  });

  it('maps plain object to domain and builds score value object', () => {
    const record = TrainingRecordMapper.toDomain({
      id: 'record-11',
      learnerId: 'learner-11',
      learnerRole: 'courier',
      moduleId: 'module-21',
      status: TrainingStatus.IN_PROGRESS,
      attempts: 2,
      score: 88
    });

    expect(record.id).toBe('record-11');
    expect(record.score?.getValue()).toBe(88);
  });
});
