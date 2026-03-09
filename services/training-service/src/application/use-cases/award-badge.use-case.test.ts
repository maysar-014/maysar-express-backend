jest.mock(
  '@shared-events/eventBus',
  () => ({
    eventBus: { publish: jest.fn() }
  }),
  { virtual: true }
);

jest.mock('uuid', () => ({
  v4: () => 'badge-fixed-id'
}));

describe('AwardBadgeUseCase', () => {
  it('persists badge, updates leaderboard, publishes event, and returns response', async () => {
    const { AwardBadgeUseCase } = await import('./award-badge.use-case');
    const badgeRepo = { save: jest.fn().mockResolvedValue(undefined) };
    const leaderboardRepo = {
      getEntry: jest.fn().mockResolvedValue({ learnerId: 'learner-1', badgesCount: 2 }),
      updateEntry: jest.fn().mockResolvedValue(undefined)
    };
    const events = { publish: jest.fn().mockResolvedValue(undefined) };
    const useCase = new AwardBadgeUseCase(
      badgeRepo as never,
      leaderboardRepo as never,
      events as never
    );

    const result = await useCase.execute({
      learnerId: 'learner-1',
      badgeType: 'QUICK_LEARNER',
      reason: 'High score',
      metadata: { score: 96 }
    });

    expect(badgeRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'badge-fixed-id',
        learnerId: 'learner-1',
        type: 'QUICK_LEARNER',
        reason: 'High score'
      })
    );
    expect(leaderboardRepo.updateEntry).toHaveBeenCalledWith({
      learnerId: 'learner-1',
      badgesCount: 3
    });
    expect(events.publish).toHaveBeenCalledWith(
      'BadgeEarned.v1',
      expect.objectContaining({
        badgeId: 'badge-fixed-id',
        learnerId: 'learner-1',
        badgeType: 'QUICK_LEARNER'
      })
    );
    expect(result.badgeId).toBe('badge-fixed-id');
  });
});
