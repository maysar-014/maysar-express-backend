import type {
  BusinessProfileDTO,
  CreateDiscussionThreadDTO,
  DiscussionThreadDTO,
  ThreadAnswerDTO
} from './discussion-thread.dto';

describe('discussion-thread DTO contracts', () => {
  it('supports discussion thread and create payloads', () => {
    const thread: DiscussionThreadDTO = {
      id: 'thread-1',
      authorId: 'user-1',
      topic: 'How to improve retention?',
      content: 'Detailed thread content for peers to answer.',
      category: 'growth',
      status: 'ACTIVE',
      expertiseLevel: 'INTERMEDIATE',
      businessContext: { industry: ['retail'], businessStage: 'growth', tags: ['retention'] },
      maxResponsesPerUser: 3,
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-02T00:00:00.000Z'
    };
    const create: CreateDiscussionThreadDTO = {
      topic: 'How to improve retention?',
      content: 'Detailed thread content for peers to answer.',
      category: 'growth',
      expertiseLevel: 'INTERMEDIATE',
      industry: ['retail'],
      businessStage: 'growth',
      tags: ['retention']
    };

    expect(thread.businessContext.industry[0]).toBe('retail');
    expect(create.expertiseLevel).toBe('INTERMEDIATE');
  });

  it('supports thread answer and business profile payloads', () => {
    const answer: ThreadAnswerDTO = {
      id: 'answer-1',
      threadId: 'thread-1',
      authorId: 'user-2',
      content: 'Implement post-purchase onboarding and proactive support.',
      qualityScore: 87,
      isAccepted: true,
      createdAt: '2026-03-02T00:00:00.000Z',
      updatedAt: '2026-03-02T00:00:00.000Z'
    };
    const profile: BusinessProfileDTO = {
      id: 'profile-1',
      userId: 'user-1',
      expertiseAreas: [{ area: 'operations', level: 'EXPERT' }],
      industryExperience: ['retail'],
      certifications: ['iso-9001'],
      contributionScore: 1800,
      contributionMetrics: {
        helpfulAnswers: 30,
        knowledgeShared: 15,
        mentorshipHours: 8,
        articlesPublished: 2,
        challengesSolved: 3
      },
      reputationTier: 'CONTRIBUTOR',
      businessGoals: [{ description: 'Increase repeat buyers', category: 'growth' }],
      learningObjectives: [{ topic: 'CRM automation', priority: 'HIGH' }],
      availableForMentorship: false,
      mentorshipCapacity: 0,
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-02T00:00:00.000Z'
    };

    expect(answer.isAccepted).toBe(true);
    expect(profile.expertiseAreas).toHaveLength(1);
  });
});
