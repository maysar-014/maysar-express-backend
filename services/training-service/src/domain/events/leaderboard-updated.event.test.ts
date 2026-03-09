import type { LeaderboardUpdatedEvent } from './leaderboard-updated.event';

describe('LeaderboardUpdatedEvent', () => {
  it('supports ranking payload with optional correlation id', () => {
    const event: LeaderboardUpdatedEvent = {
      learnerId: 'learner-4',
      learnerRole: 'courier',
      rank: 5,
      totalPoints: 880,
      updatedAt: new Date('2026-03-08T03:00:00.000Z'),
      correlationId: 'corr-1'
    };

    expect(event.rank).toBe(5);
    expect(event.correlationId).toBe('corr-1');
  });
});
