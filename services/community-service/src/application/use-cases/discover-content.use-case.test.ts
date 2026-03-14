import { DiscoverContentUseCase } from './discover-content.use-case';
import { KnowledgeDiscoveryEngine } from '../../domain/engines/knowledge-discovery-engine';

describe('DiscoverContentUseCase', () => {
  const setup = () => {
    const profileRepository = {
      findByUserId: jest.fn().mockResolvedValue({
        id: 'profile-1',
        userId: 'user-1',
        businessGoals: [{ description: 'grow revenue', category: 'sales', priority: 'HIGH' }],
        learningObjectives: [{ topic: 'sales', priority: 'HIGH' }],
        expertiseAreas: ['sales'],
        industryExperience: ['retail']
      })
    };
    const contentRepository = {
      findAvailableContent: jest.fn().mockResolvedValue([
        {
          id: 'content-1',
          type: 'ARTICLE',
          title: 'Sales pipeline optimization',
          category: 'sales',
          industryTags: ['retail'],
          expertiseLevel: 'INTERMEDIATE',
          qualityScore: 88,
          engagementScore: 80,
          createdAt: new Date(),
          wordCount: 600
        },
        {
          id: 'content-2',
          type: 'THREAD',
          title: 'Handling objections in retail',
          category: 'sales',
          industryTags: ['retail'],
          expertiseLevel: 'BEGINNER',
          qualityScore: 82,
          engagementScore: 75,
          createdAt: new Date(),
          wordCount: 300
        }
      ])
    };
    const interactionRepository = {
      getRecentInteractions: jest.fn().mockResolvedValue([
        {
          contentId: 'seen-1',
          contentType: 'POST',
          category: 'general',
          timestamp: new Date()
        }
      ]),
      logDiscovery: jest.fn().mockResolvedValue(undefined)
    };

    const useCase = new DiscoverContentUseCase(
      profileRepository as never,
      contentRepository as never,
      interactionRepository as never
    );

    return { useCase, profileRepository, contentRepository, interactionRepository };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when user profile does not exist', async () => {
    const ctx = setup();
    ctx.profileRepository.findByUserId.mockResolvedValue(null);

    await expect(ctx.useCase.execute({ userId: 'missing-user' })).rejects.toThrow(
      'User business profile not found'
    );
  });

  it('discovers content, applies maxResults, and logs recommendations', async () => {
    const ctx = setup();
    jest.spyOn(KnowledgeDiscoveryEngine, 'discoverContent').mockReturnValue([
      {
        contentId: 'content-1',
        contentType: 'ARTICLE',
        title: 'Sales pipeline optimization',
        category: 'sales',
        relevanceScore: 0.95,
        recommendationReasons: ['High-quality content'],
        estimatedReadTime: 3
      },
      {
        contentId: 'content-2',
        contentType: 'THREAD',
        title: 'Handling objections in retail',
        category: 'sales',
        relevanceScore: 0.91,
        recommendationReasons: ['Matches your goals'],
        estimatedReadTime: 2
      }
    ]);

    const result = await ctx.useCase.execute({
      userId: 'user-1',
      sessionType: 'weekly',
      maxResults: 1
    });

    expect(ctx.contentRepository.findAvailableContent).toHaveBeenCalledWith({
      excludeIds: ['seen-1'],
      minQualityScore: 60
    });
    expect(ctx.interactionRepository.logDiscovery).toHaveBeenCalledWith('user-1', ['content-1']);
    expect(result).toEqual({
      recommendations: [
        expect.objectContaining({
          contentId: 'content-1',
          category: 'sales'
        })
      ],
      totalAvailable: 2,
      sessionType: 'weekly'
    });
  });
});
