import type { TrainingStartedEvent } from './training-started.event';

describe('TrainingStartedEvent', () => {
  it('captures learner, module, and attempt information', () => {
    const event: TrainingStartedEvent = {
      learnerId: 'learner-3',
      learnerRole: 'courier',
      moduleId: 'module-2',
      startedAt: new Date('2026-03-08T02:00:00.000Z'),
      attemptNumber: 2
    };

    expect(event.moduleId).toBe('module-2');
    expect(event.attemptNumber).toBe(2);
  });
});
