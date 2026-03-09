import type { TrainingCompletedEvent } from './training-completed.event';

describe('TrainingCompletedEvent', () => {
  it('captures completion score, pass status, and expiry metadata', () => {
    const event: TrainingCompletedEvent = {
      learnerId: 'learner-8',
      learnerRole: 'courier',
      moduleId: 'module-5',
      score: 96,
      passed: true,
      completedAt: new Date('2026-03-08T07:00:00.000Z'),
      expiresAt: new Date('2027-03-08T07:00:00.000Z'),
      remainingAttempts: 0
    };

    expect(event.passed).toBe(true);
    expect(event.expiresAt).toBeDefined();
  });
});
