import type { TrainingFailedEvent } from './training-failed.event';

describe('TrainingFailedEvent', () => {
  it('captures failed score and remaining attempts', () => {
    const event: TrainingFailedEvent = {
      learnerId: 'learner-5',
      learnerRole: 'courier',
      moduleId: 'module-3',
      score: 42,
      failedAt: new Date('2026-03-08T04:00:00.000Z'),
      remainingAttempts: 1
    };

    expect(event.score).toBe(42);
    expect(event.remainingAttempts).toBe(1);
  });
});
