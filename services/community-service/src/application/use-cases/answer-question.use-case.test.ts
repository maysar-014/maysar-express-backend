import { AnswerQuestionUseCase } from './answer-question.use-case';

describe('AnswerQuestionUseCase', () => {
  const baseRequest = {
    threadId: 'thread-1',
    answerId: 'answer-1',
    answererUserId: 'user-1',
    content:
      'I recommend starting with a customer mapping workshop and, for example, tracking weekly conversion from lead to delivered order. '.repeat(
        3
      )
  };

  const setup = () => {
    const thread = {
      id: 'thread-1',
      authorId: 'author-1',
      category: 'logistics',
      status: 'OPEN',
      canUserRespond: jest.fn().mockReturnValue(true),
      activate: jest.fn()
    };
    const profile = {
      expertiseAreas: [{ area: 'logistics' }],
      contributionMetrics: { helpfulAnswers: 4 },
      updateContributionMetrics: jest.fn()
    };

    const threadRepository = {
      findById: jest.fn().mockResolvedValue(thread),
      save: jest.fn().mockResolvedValue(thread),
      getUserResponseCount: jest.fn().mockResolvedValue(0)
    };
    const answerRepository = {
      save: jest.fn().mockImplementation(async answer => answer)
    };
    const profileRepository = {
      findByUserId: jest.fn().mockResolvedValue(profile),
      save: jest.fn().mockResolvedValue(profile)
    };
    const eventPublisher = { publish: jest.fn().mockResolvedValue(undefined) };

    const useCase = new AnswerQuestionUseCase(
      threadRepository as never,
      answerRepository as never,
      profileRepository as never,
      eventPublisher as never
    );

    return {
      useCase,
      thread,
      profile,
      threadRepository,
      answerRepository,
      profileRepository,
      eventPublisher
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when thread is not found', async () => {
    const ctx = setup();
    ctx.threadRepository.findById.mockResolvedValue(null);

    await expect(ctx.useCase.execute(baseRequest)).rejects.toThrow('Discussion thread not found');
  });

  it('throws when thread is closed', async () => {
    const ctx = setup();
    ctx.thread.status = 'CLOSED';

    await expect(ctx.useCase.execute(baseRequest)).rejects.toThrow('Cannot answer a closed thread');
  });

  it('throws when user exceeds response limit', async () => {
    const ctx = setup();
    ctx.thread.canUserRespond.mockReturnValue(false);

    await expect(ctx.useCase.execute(baseRequest)).rejects.toThrow(
      'Maximum responses per user exceeded for this thread'
    );
  });

  it('throws when answer content is too short', async () => {
    const ctx = setup();

    await expect(ctx.useCase.execute({ ...baseRequest, content: 'Too short' })).rejects.toThrow(
      'Answer must be at least 50 characters'
    );
  });

  it('persists answer, updates profile, and publishes event on success', async () => {
    const ctx = setup();

    const result = await ctx.useCase.execute(baseRequest);

    expect(ctx.answerRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'answer-1',
        threadId: 'thread-1',
        qualityScore: 95
      })
    );
    expect(ctx.thread.activate).toHaveBeenCalled();
    expect(ctx.threadRepository.save).toHaveBeenCalledWith(ctx.thread);
    expect(ctx.profile.updateContributionMetrics).toHaveBeenCalledWith({
      helpfulAnswers: 5
    });
    expect(ctx.profileRepository.save).toHaveBeenCalledWith(ctx.profile);
    expect(ctx.eventPublisher.publish).toHaveBeenCalledWith(
      'AnswerProvided',
      expect.objectContaining({
        threadId: 'thread-1',
        answererId: 'user-1',
        hasRelevantExpertise: true,
        contributionPoints: 35
      })
    );
    expect(result).toEqual({
      answerId: 'answer-1',
      threadId: 'thread-1',
      contributionPoints: 35,
      qualityScore: 95
    });
  });
});
