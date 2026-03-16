jest.mock(
  '@shared-events/eventBus',
  () => ({
    eventBus: { publish: jest.fn() }
  }),
  { virtual: true }
);

jest.mock('@shared/ids/id', () => {
  const actual = jest.requireActual('@shared/ids/id');
  return {
    ...actual,
    makeId: jest.fn(() => 'trn_rec_01H00000000000000000000000')
  };
});

import { ContentType, DifficultyLevel, TrainingModule } from '../../domain/entities/training-module.entity';
import { CertificationRequirement } from '../../domain/entities/certification-requirement.entity';
import { TrainingRecord } from '../../domain/entities/training-record.entity';
import { makeId } from '@shared/ids/id';

describe('StartTrainingUseCase', () => {
  it('creates new record, starts training, saves and publishes event', async () => {
    const { StartTrainingUseCase } = await import('./start-training.use-case');
    const moduleRepo = {
      findById: jest.fn().mockResolvedValue(
        TrainingModule.create({
          id: 'module-1',
          name: 'Safety',
          description: 'Basics',
          contentType: ContentType.TEXT,
          content: { type: ContentType.TEXT, body: 'x' },
          durationMinutes: 20,
          category: 'core',
          prerequisites: [],
          targetRoles: [],
          isPublic: true,
          difficulty: DifficultyLevel.BEGINNER
        })
      )
    };
    const requirementRepo = {
      findByModule: jest.fn().mockResolvedValue(
        CertificationRequirement.create({
          module: 'module-1',
          minimumScore: 70,
          validityPeriodDays: 365,
          mandatory: true,
          maxAttempts: 3
        })
      )
    };
    const trainingRecordRepo = {
      findByLearnerId: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockResolvedValue(undefined)
    };
    const trainingPolicy = {
      canStartTraining: jest
        .fn()
        .mockReturnValue({ canStart: true, warnings: ['w1'], recommendations: ['r1'] })
    };
    const events = { publish: jest.fn().mockResolvedValue(undefined) };
    const useCase = new StartTrainingUseCase(
      trainingRecordRepo as never,
      moduleRepo as never,
      requirementRepo as never,
      trainingPolicy as never,
      events as never
    );
    (makeId as jest.Mock).mockReturnValue('trn_rec_01H00000000000000000000000');

    const result = await useCase.execute({
      learnerId: 'learner-1',
      learnerRole: 'courier',
      moduleId: 'module-1'
    });

    expect(trainingRecordRepo.save).toHaveBeenCalledTimes(1);
    const savedRecord = trainingRecordRepo.save.mock.calls[0][0] as TrainingRecord;
    expect(savedRecord.id).toBe('trn_rec_01H00000000000000000000000');
    expect(savedRecord.status).toBe('IN_PROGRESS');
    expect(events.publish).toHaveBeenCalledWith(
      'TrainingStarted.v1',
      expect.objectContaining({
        trainingRecordId: 'trn_rec_01H00000000000000000000000',
        learnerId: 'learner-1',
        moduleId: 'module-1'
      })
    );
    expect(result.trainingRecordId).toBe('trn_rec_01H00000000000000000000000');
    expect(result.warnings).toEqual(['w1']);
    expect(result.recommendations).toEqual(['r1']);
  });

  it('throws not found when module is missing', async () => {
    const { StartTrainingUseCase } = await import('./start-training.use-case');
    const useCase = new StartTrainingUseCase(
      { findByLearnerId: jest.fn(), save: jest.fn() } as never,
      { findById: jest.fn().mockResolvedValue(null) } as never,
      { findByModule: jest.fn() } as never,
      { canStartTraining: jest.fn() } as never,
      { publish: jest.fn() } as never
    );

    await expect(
      useCase.execute({ learnerId: 'l1', learnerRole: 'courier', moduleId: 'missing-module' })
    ).rejects.toThrow('TrainingModule with identifier missing-module was not found');
  });
});
