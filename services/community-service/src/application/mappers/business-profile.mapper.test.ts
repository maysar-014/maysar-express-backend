import {
  BusinessProfile,
  ReputationTier
} from '../../domain/entities/business-profile.entity';
import { BusinessProfileMapper } from './business-profile.mapper';

const buildEntity = (): BusinessProfile =>
  new BusinessProfile({
    id: 'profile-1',
    userId: 'user-1',
    businessId: 'biz-1',
    expertiseAreas: [
      { area: 'inventory', level: 'EXPERT', verifiedAt: new Date('2026-02-01T00:00:00.000Z') }
    ],
    industryExperience: ['retail'],
    certifications: ['iso-9001'],
    contributionScore: 1800,
    contributionMetrics: {
      helpfulAnswers: 50,
      knowledgeShared: 22,
      mentorshipHours: 10,
      articlesPublished: 5,
      challengesSolved: 4
    },
    reputationTier: ReputationTier.CONTRIBUTOR,
    businessGoals: [{ description: 'Increase conversion', category: 'sales' }],
    learningObjectives: [{ topic: 'Advanced analytics', priority: 'HIGH' }],
    availableForMentorship: false,
    mentorshipCapacity: 0,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z')
  });

describe('BusinessProfileMapper', () => {
  it('maps entity to dto', () => {
    const dto = BusinessProfileMapper.toDTO(buildEntity());

    expect(dto.id).toBe('profile-1');
    expect(dto.reputationTier).toBe(ReputationTier.CONTRIBUTOR);
    expect(dto.expertiseAreas[0].verifiedAt).toBe('2026-02-01T00:00:00.000Z');
  });

  it('maps dto back to entity', () => {
    const dto = BusinessProfileMapper.toDTO(buildEntity());
    const entity = BusinessProfileMapper.toEntity(dto);

    expect(entity).toBeInstanceOf(BusinessProfile);
    expect(entity.userId).toBe('user-1');
    expect(entity.expertiseAreas[0].area).toBe('inventory');
  });
});
