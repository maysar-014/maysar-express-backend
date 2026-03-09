import { GetTrainingProgressUseCase } from './get-training-progress.use-case';

describe('GetTrainingProgressUseCase', () => {
  it('returns grouped progress and required modules', async () => {
    const completedRecord = {
      id: 'rec-1',
      moduleId: 'module-a',
      status: 'COMPLETED',
      startedAt: new Date('2026-03-08T00:00:00.000Z'),
      completedAt: new Date('2026-03-08T01:00:00.000Z'),
      score: { getValue: () => 95 },
      attempts: 1,
      progress: { completionPercentage: 100 },
      expiresAt: new Date('2027-03-08T00:00:00.000Z'),
      isExpired: jest.fn().mockReturnValue(false)
    };
    const expiredCompletedRecord = {
      ...completedRecord,
      id: 'rec-2',
      moduleId: 'module-expired',
      isExpired: jest.fn().mockReturnValue(true)
    };
    const inProgressRecord = {
      id: 'rec-3',
      moduleId: 'module-b',
      status: 'IN_PROGRESS',
      startedAt: new Date('2026-03-08T02:00:00.000Z'),
      completedAt: undefined,
      score: undefined,
      attempts: 1,
      progress: { completionPercentage: 50 },
      expiresAt: undefined,
      isExpired: jest.fn().mockReturnValue(false)
    };
    const trainingRecordRepo = {
      findByLearnerId: jest
        .fn()
        .mockResolvedValue([completedRecord, expiredCompletedRecord, inProgressRecord])
    };
    const requirementRepo = {
      findAll: jest.fn().mockResolvedValue([
        { module: 'module-a', mandatory: true },
        { module: 'module-c', mandatory: true },
        { module: 'module-optional', mandatory: false }
      ])
    };
    const eligibilityEngine = {
      checkEligibility: jest.fn().mockReturnValue({ eligible: true })
    };
    const useCase = new GetTrainingProgressUseCase(
      trainingRecordRepo as never,
      requirementRepo as never,
      eligibilityEngine as never
    );

    const result = await useCase.execute({ learnerId: 'learner-1' });

    expect(result.completed.map(r => r.id)).toEqual(['rec-1']);
    expect(result.inProgress.map(r => r.id)).toEqual(['rec-3']);
    expect(result.required).toEqual(['module-c']);
    expect(result.eligible).toBe(true);
  });
});
