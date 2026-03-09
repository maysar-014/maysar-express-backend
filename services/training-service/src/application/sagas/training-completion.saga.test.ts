jest.mock(
  '@shared-events/eventBus',
  () => ({
    eventBus: {
      subscribe: jest.fn()
    }
  }),
  { virtual: true }
);

describe('TrainingCompletionSaga', () => {
  beforeEach(() => {
    const { eventBus } = require('@shared-events/eventBus');
    eventBus.subscribe.mockClear();
  });

  it('subscribes to completion event and performs leaderboard + badge actions', async () => {
    const { TrainingCompletionSaga } = await import('./training-completion.saga');
    const { eventBus } = require('@shared-events/eventBus');
    const awardBadgeUseCase = { execute: jest.fn().mockResolvedValue(undefined) };
    const leaderboardRepo = { updateEntry: jest.fn().mockResolvedValue(undefined) };
    const trainingRecordRepo = {
      findByLearnerId: jest.fn().mockResolvedValue([
        { status: 'COMPLETED', score: { getValue: () => 90 } },
        { status: 'COMPLETED', score: { getValue: () => 95 } },
        { status: 'COMPLETED', score: { getValue: () => 80 } },
        { status: 'COMPLETED', score: { getValue: () => 88 } },
        { status: 'COMPLETED', score: { getValue: () => 92 } }
      ])
    };

    new TrainingCompletionSaga(
      awardBadgeUseCase as never,
      leaderboardRepo as never,
      trainingRecordRepo as never
    );

    expect(eventBus.subscribe).toHaveBeenCalledTimes(1);
    expect(eventBus.subscribe).toHaveBeenCalledWith(
      'TrainingCompleted.v1',
      expect.any(Function)
    );

    const handler = eventBus.subscribe.mock.calls[0][1];
    await handler({
      learnerId: 'learner-1',
      score: 95,
      moduleId: 'module-1',
      remainingAttempts: 2
    });

    expect(leaderboardRepo.updateEntry).toHaveBeenCalledWith({
      learnerId: 'learner-1',
      totalScore: 445,
      modulesCount: 5
    });
    expect(awardBadgeUseCase.execute).toHaveBeenCalledTimes(2);
    expect(awardBadgeUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ badgeType: 'QUICK_LEARNER' })
    );
    expect(awardBadgeUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ badgeType: 'VETERAN' })
    );
  });
});
