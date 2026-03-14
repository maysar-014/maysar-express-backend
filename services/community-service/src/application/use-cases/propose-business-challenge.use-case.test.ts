import { ProposeBusinessChallengeUseCase } from './propose-business-challenge.use-case';
import { ReputationTier } from '../../domain/entities/business-profile.entity';
import { ContentModerationPolicy } from '../../domain/policies/content-moderation.policy';
import { DiscussionMatchingEngine } from '../../domain/engines/discussion-matching-engine';

describe('ProposeBusinessChallengeUseCase', () => {
  const request = {
    proposerId: 'user-1',
    title: 'Improve delivery profitability',
    description:
      'We need a revenue growth strategy for delivery operations with measurable operational improvements. '.repeat(
        3
      ),
    category: 'logistics',
    industryTags: ['delivery', 'retail'],
    constraints: ['limited budget'],
    successCriteria: [
      { description: 'Increase gross margin by 10%', measurable: true, targetValue: '10%' }
    ],
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  };

  const setup = () => {
    const challengeRepository = {
      save: jest.fn().mockImplementation(async challenge => challenge),
      findSimilar: jest.fn().mockResolvedValue([])
    };
    const profileRepository = {
      findByUserId: jest.fn().mockResolvedValue({
        id: 'profile-1',
        userId: 'user-1',
        reputationTier: ReputationTier.EXPERT,
        expertiseAreas: [{ area: 'logistics', level: 'EXPERT' }]
      })
    };
    const quotaRepository = {
      findByUserAndType: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockImplementation(async quota => quota)
    };
    const expertProvider = {
      getAvailableExperts: jest.fn().mockResolvedValue([
        {
          userId: 'expert-1',
          expertiseAreas: [{ area: 'logistics', level: 'MENTOR' }],
          isAvailableForMentorship: true,
          mentorshipCapacity: 5,
          currentMentees: 1,
          responseHistory: {
            totalResponses: 100,
            acceptedAnswers: 80,
            averageResponseTimeMinutes: 30
          },
          topicRelevanceScores: new Map([['Improve delivery profitability', 0.95]])
        }
      ])
    };
    const eventPublisher = { publish: jest.fn().mockResolvedValue(undefined) };

    const useCase = new ProposeBusinessChallengeUseCase(
      challengeRepository as never,
      profileRepository as never,
      quotaRepository as never,
      expertProvider as never,
      eventPublisher as never
    );

    return {
      useCase,
      challengeRepository,
      profileRepository,
      quotaRepository,
      expertProvider,
      eventPublisher
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when proposer profile is missing', async () => {
    const ctx = setup();
    ctx.profileRepository.findByUserId.mockResolvedValue(null);

    await expect(ctx.useCase.execute(request as never)).rejects.toThrow(
      'User business profile not found'
    );
  });

  it('throws when similar challenge already exists', async () => {
    const ctx = setup();
    ctx.challengeRepository.findSimilar.mockResolvedValue([{ id: 'existing' }]);

    await expect(ctx.useCase.execute(request as never)).rejects.toThrow(
      'Similar challenge exists within the last 30 days'
    );
  });

  it('creates challenge, consumes quota, matches experts, and publishes event', async () => {
    const ctx = setup();
    jest.spyOn(ContentModerationPolicy, 'performFullAssessment').mockReturnValue({
      meetsQualityThreshold: true,
      qualityScore: 88,
      issues: []
    });
    jest.spyOn(DiscussionMatchingEngine, 'matchExpertsToThread').mockReturnValue([
      {
        userId: 'expert-1',
        expertiseArea: 'logistics',
        expertiseLevel: 'MENTOR',
        matchConfidence: 0.95,
        matchReasons: ['High topic relevance'],
        isAvailable: true,
        responseRate: 0.8,
        averageResponseTime: 30
      }
    ]);

    const result = await ctx.useCase.execute(request as never);

    expect(ctx.challengeRepository.save).toHaveBeenCalledTimes(1);
    expect(ctx.quotaRepository.save).toHaveBeenCalled();
    expect(ctx.eventPublisher.publish).toHaveBeenCalledWith(
      'ChallengeProposed',
      expect.objectContaining({
        proposerId: 'user-1',
        title: request.title,
        matchedExperts: ['expert-1'],
        qualityScore: 88
      })
    );
    expect(result.matchedExperts).toEqual(['expert-1']);
    expect(result.challenge.title).toBe(request.title);
    expect(typeof result.quotaRemaining).toBe('number');
  });
});
