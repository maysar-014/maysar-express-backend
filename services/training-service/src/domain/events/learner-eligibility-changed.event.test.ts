import type { LearnerEligibilityChangedEvent } from './learner-eligibility-changed.event';

describe('LearnerEligibilityChangedEvent', () => {
  it('supports eligible and missing requirements payload', () => {
    const event: LearnerEligibilityChangedEvent = {
      learnerId: 'learner-2',
      learnerRole: 'courier',
      eligible: false,
      missingRequirements: ['safety-module', 'score-threshold'],
      changedAt: new Date('2026-03-08T01:00:00.000Z')
    };

    expect(event.eligible).toBe(false);
    expect(event.missingRequirements).toContain('safety-module');
  });
});
