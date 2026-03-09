import type { TrainingProgressUpdatedEvent } from './training-progress-updated.event';

describe('TrainingProgressUpdatedEvent', () => {
  it('supports progress payload with optional section and correlation id', () => {
    const event: TrainingProgressUpdatedEvent = {
      learnerId: 'learner-7',
      learnerRole: 'courier',
      moduleId: 'module-4',
      progressPercentage: 75,
      currentSection: 'chapter-3',
      updatedAt: new Date('2026-03-08T06:00:00.000Z'),
      correlationId: 'corr-3'
    };

    expect(event.progressPercentage).toBe(75);
    expect(event.currentSection).toBe('chapter-3');
  });
});
