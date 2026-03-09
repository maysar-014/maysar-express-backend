import type {
  BusinessChallengeDTO,
  ContentRecommendationDTO,
  KnowledgeArticleDTO
} from './knowledge-article.dto';

describe('knowledge-article DTO contracts', () => {
  it('supports knowledge article payload shape', () => {
    const article: KnowledgeArticleDTO = {
      id: 'article-1',
      authorId: 'user-1',
      title: 'Reducing fulfillment delays',
      summary: 'A tactical framework for same-day dispatch.',
      sections: [{ heading: 'Root Causes', content: 'Operational bottlenecks', order: 1 }],
      category: 'operations',
      industryTags: ['retail'],
      expertiseLevel: 'ADVANCED',
      reviewStatus: 'APPROVED',
      qualityScore: 92,
      version: 3,
      publishedAt: '2026-03-08T00:00:00.000Z',
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-05T00:00:00.000Z'
    };

    expect(article.sections).toHaveLength(1);
    expect(article.reviewStatus).toBe('APPROVED');
  });

  it('supports challenge and recommendation payloads', () => {
    const challenge: BusinessChallengeDTO = {
      id: 'challenge-1',
      proposerId: 'user-2',
      title: 'Lower return rate',
      description: 'Need strategies to reduce avoidable returns.',
      category: 'quality',
      industryTags: ['fmcg'],
      constraints: ['budget'],
      successCriteria: [{ description: 'drop rate by 20%', measurable: true, targetValue: '20%' }],
      status: 'OPEN',
      collaborators: ['user-3'],
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z'
    };
    const recommendation: ContentRecommendationDTO = {
      contentId: 'article-1',
      contentType: 'ARTICLE',
      title: 'Reducing fulfillment delays',
      category: 'operations',
      relevanceScore: 0.91,
      recommendationReasons: ['industry-match'],
      estimatedReadTime: 8
    };

    expect(challenge.successCriteria[0].measurable).toBe(true);
    expect(recommendation.relevanceScore).toBeGreaterThan(0.9);
  });
});
