jest.mock(
  '@shared-events/eventBus',
  () => ({
    eventBus: { publish: jest.fn() }
  }),
  { virtual: true }
);

import { CertificationRequirement } from '../../domain/entities/certification-requirement.entity';
import { TrainingRecord } from '../../domain/entities/training-record.entity';
import { NotFoundError } from '../../domain/errors/domain.error';
import { TrainingStatus } from '../../domain/value-objects/training-status.value-object';
import { CompleteTrainingUseCase } from './complete-training.use-case';

describe('CompleteTrainingUseCase', () => {
  const makeRequirement = (overrides: Partial<Parameters<typeof CertificationRequirement.create>[0]> = {}) =>
    CertificationRequirement.create({
      module: 'module-1',
      minimumScore: 70,
      validityPeriodDays: 365,
      mandatory: true,
      maxAttempts: 3,
      ...overrides
    });

  const makeInProgressRecord = (overrides: Partial<Parameters<typeof TrainingRecord.create>[0]> = {}) =>
    TrainingRecord.create({
      id: 'record-1',
      learnerId: 'learner-1',
      learnerRole: 'COURIER',
      moduleId: 'module-1',
      status: TrainingStatus.IN_PROGRESS,
      attempts: 1,
      startedAt: new Date('2026-03-08T10:00:00.000Z'),
      ...overrides
    });

  it('throws NotFoundError when training record is missing', async () => {
    const useCase = new CompleteTrainingUseCase(
      { findById: jest.fn().mockResolvedValue(null) } as never,
      { findByModule: jest.fn(), findAll: jest.fn() } as never,
      { checkEligibility: jest.fn() } as never,
      { publish: jest.fn() } as never
    );

    await expect(useCase.execute({ trainingRecordId: 'missing-record', score: 90 })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws NotFoundError when certification requirement is missing', async () => {
    const record = makeInProgressRecord();
    const useCase = new CompleteTrainingUseCase(
      {
        findById: jest.fn().mockResolvedValue(record),
        save: jest.fn(),
        findByLearnerId: jest.fn()
      } as never,
      { findByModule: jest.fn().mockResolvedValue(null), findAll: jest.fn() } as never,
      { checkEligibility: jest.fn() } as never,
      { publish: jest.fn() } as never
    );

    await expect(useCase.execute({ trainingRecordId: 'record-1', score: 90 })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('publishes eligibility + completion events when learner passes', async () => {
    const record = makeInProgressRecord();
    const trainingRecordRepo = {
      findById: jest.fn().mockResolvedValue(record),
      save: jest.fn().mockResolvedValue(undefined),
      findByLearnerId: jest.fn().mockResolvedValue([record])
    };
    const requirementRepo = {
      findByModule: jest.fn().mockResolvedValue(makeRequirement({ minimumScore: 70, maxAttempts: 4 })),
      findAll: jest.fn().mockResolvedValue([makeRequirement()])
    };
    const eligibilityEngine = {
      checkEligibility: jest.fn().mockReturnValue({
        eligible: true,
        missingRequirements: []
      })
    };
    const events = { publish: jest.fn().mockResolvedValue(undefined) };
    const useCase = new CompleteTrainingUseCase(
      trainingRecordRepo as never,
      requirementRepo as never,
      eligibilityEngine as never,
      events as never
    );

    const result = await useCase.execute({ trainingRecordId: 'record-1', score: 85 });

    expect(trainingRecordRepo.save).toHaveBeenCalledWith(record);
    expect(eligibilityEngine.checkEligibility).toHaveBeenCalledWith([record], expect.any(Array));
    expect(events.publish).toHaveBeenNthCalledWith(
      1,
      'LearnerEligibilityChanged.v1',
      expect.objectContaining({ learnerId: 'learner-1', eligible: true })
    );
    expect(events.publish).toHaveBeenNthCalledWith(
      2,
      'TrainingCompleted.v1',
      expect.objectContaining({ trainingRecordId: 'record-1', passed: true })
    );
    expect(result.passed).toBe(true);
    expect(result.score).toBe(85);
    expect(result.expiresAt).toBeDefined();
  });

  it('publishes failure event when learner does not pass', async () => {
    const record = makeInProgressRecord({ id: 'record-2', attempts: 2 });
    const events = { publish: jest.fn().mockResolvedValue(undefined) };
    const useCase = new CompleteTrainingUseCase(
      {
        findById: jest.fn().mockResolvedValue(record),
        save: jest.fn().mockResolvedValue(undefined),
        findByLearnerId: jest.fn()
      } as never,
      {
        findByModule: jest.fn().mockResolvedValue(makeRequirement({ minimumScore: 95, maxAttempts: 3 })),
        findAll: jest.fn()
      } as never,
      { checkEligibility: jest.fn() } as never,
      events as never
    );

    const result = await useCase.execute({ trainingRecordId: 'record-2', score: 40 });

    expect(events.publish).toHaveBeenCalledWith(
      'TrainingFailed.v1',
      expect.objectContaining({
        trainingRecordId: 'record-2',
        score: 40,
        remainingAttempts: 1
      })
    );
    expect(result).toEqual({
      passed: false,
      score: 40,
      expiresAt: undefined
    });
  });
});

