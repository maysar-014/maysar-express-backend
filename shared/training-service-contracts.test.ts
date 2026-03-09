import type {
  CertificationExpiredEvent,
  LearnerEligibilityChangedEvent,
  TrainingCompletedEvent,
  TrainingFailedEvent,
  TrainingStartedEvent
} from '../shared-contracts/training-service-contracts';

describe('training-service contracts', () => {
  it('supports training lifecycle event payloads', () => {
    const started: TrainingStartedEvent = {
      learnerId: 'learner-1',
      learnerRole: 'seller',
      moduleId: 'module-1',
      startedAt: new Date('2026-03-09T00:00:00.000Z'),
      attemptNumber: 1
    };
    const completed: TrainingCompletedEvent = {
      learnerId: 'learner-1',
      learnerRole: 'seller',
      moduleId: 'module-1',
      score: 85,
      passed: true,
      completedAt: new Date('2026-03-09T01:00:00.000Z'),
      remainingAttempts: 2
    };
    const failed: TrainingFailedEvent = {
      learnerId: 'learner-2',
      learnerRole: 'courier',
      moduleId: 'module-1',
      score: 40,
      failedAt: new Date('2026-03-09T01:00:00.000Z'),
      remainingAttempts: 1
    };
    const expired: CertificationExpiredEvent = {
      learnerId: 'learner-1',
      moduleId: 'module-1',
      expiredAt: new Date('2027-03-09T00:00:00.000Z')
    };
    const eligibility: LearnerEligibilityChangedEvent = {
      learnerId: 'learner-2',
      learnerRole: 'courier',
      eligible: false,
      missingRequirements: ['training-module-1'],
      changedAt: new Date('2026-03-09T02:00:00.000Z')
    };

    expect(started.attemptNumber).toBe(1);
    expect(completed.passed).toBe(true);
    expect(failed.remainingAttempts).toBe(1);
    expect(expired.moduleId).toBe('module-1');
    expect(eligibility.eligible).toBe(false);
  });
});
