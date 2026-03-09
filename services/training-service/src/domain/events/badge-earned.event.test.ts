import type { BadgeEarnedEvent } from './badge-earned.event';

describe('BadgeEarnedEvent', () => {
  it('supports badge payload and optional correlation id', () => {
    const event: BadgeEarnedEvent = {
      learnerId: 'learner-6',
      learnerRole: 'courier',
      badgeId: 'badge-1',
      badgeName: 'Safety Master',
      earnedAt: new Date('2026-03-08T05:00:00.000Z'),
      criteria: 'score >= 90',
      correlationId: 'corr-2'
    };

    expect(event.badgeName).toBe('Safety Master');
    expect(event.criteria).toBe('score >= 90');
  });
});
