import { BusinessProfile, ReputationTier } from '../../domain/entities/business-profile.entity';
import { PrismaBusinessProfileRepository } from './prisma-business-profile.repository';

describe('PrismaBusinessProfileRepository', () => {
  const makePrisma = () => ({
    community_BusinessProfile: {
      upsert: jest.fn(),
      findUnique: jest.fn()
    }
  });

  it('saves profile via upsert and maps to domain', async () => {
    const prisma = makePrisma();
    const now = new Date('2026-03-09T00:00:00.000Z');
    const profile = BusinessProfile.create({ id: 'bp1', userId: 'u1' });
    const record = {
      id: profile.id,
      userId: profile.userId,
      businessId: profile.businessId,
      expertiseAreas: profile.expertiseAreas,
      industryExperience: profile.industryExperience,
      certifications: profile.certifications,
      contributionScore: profile.contributionScore,
      contributionMetrics: profile.contributionMetrics,
      reputationTier: ReputationTier.NEWCOMER,
      businessGoals: profile.businessGoals,
      learningObjectives: profile.learningObjectives,
      availableForMentorship: profile.availableForMentorship,
      mentorshipCapacity: profile.mentorshipCapacity,
      createdAt: now,
      updatedAt: now
    };
    prisma.community_BusinessProfile.upsert.mockResolvedValue(record);
    const repo = new PrismaBusinessProfileRepository(prisma as never);

    const saved = await repo.save(profile);

    expect(prisma.community_BusinessProfile.upsert).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      create: expect.objectContaining({
        id: 'bp1',
        userId: 'u1',
        contributionScore: 0
      }),
      update: expect.objectContaining({
        id: 'bp1',
        userId: 'u1'
      })
    });
    expect(saved).toBeInstanceOf(BusinessProfile);
    expect(saved.userId).toBe('u1');
  });

  it('findByUserId returns mapped profile or null', async () => {
    const prisma = makePrisma();
    prisma.community_BusinessProfile.findUnique
      .mockResolvedValueOnce({
        id: 'bp1',
        userId: 'u1',
        businessId: 'b1',
        expertiseAreas: [],
        industryExperience: [],
        certifications: [],
        contributionScore: 1,
        contributionMetrics: {
          helpfulAnswers: 0,
          knowledgeShared: 0,
          mentorshipHours: 0,
          articlesPublished: 0,
          challengesSolved: 0
        },
        reputationTier: ReputationTier.NEWCOMER,
        businessGoals: [],
        learningObjectives: [],
        availableForMentorship: false,
        mentorshipCapacity: 0,
        createdAt: new Date('2026-03-09T00:00:00.000Z'),
        updatedAt: new Date('2026-03-09T00:00:00.000Z')
      })
      .mockResolvedValueOnce(null);
    const repo = new PrismaBusinessProfileRepository(prisma as never);

    await expect(repo.findByUserId('u1')).resolves.toBeInstanceOf(BusinessProfile);
    await expect(repo.findByUserId('missing')).resolves.toBeNull();
  });

  it('findById returns mapped profile or null', async () => {
    const prisma = makePrisma();
    prisma.community_BusinessProfile.findUnique
      .mockResolvedValueOnce({
        id: 'bp1',
        userId: 'u1',
        businessId: undefined,
        expertiseAreas: [],
        industryExperience: [],
        certifications: [],
        contributionScore: 1,
        contributionMetrics: {
          helpfulAnswers: 0,
          knowledgeShared: 0,
          mentorshipHours: 0,
          articlesPublished: 0,
          challengesSolved: 0
        },
        reputationTier: ReputationTier.NEWCOMER,
        businessGoals: [],
        learningObjectives: [],
        availableForMentorship: false,
        mentorshipCapacity: 0,
        createdAt: new Date('2026-03-09T00:00:00.000Z'),
        updatedAt: new Date('2026-03-09T00:00:00.000Z')
      })
      .mockResolvedValueOnce(null);
    const repo = new PrismaBusinessProfileRepository(prisma as never);

    await expect(repo.findById('bp1')).resolves.toBeInstanceOf(BusinessProfile);
    await expect(repo.findById('missing')).resolves.toBeNull();
  });
});
