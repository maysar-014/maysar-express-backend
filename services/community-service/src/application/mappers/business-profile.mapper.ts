import { BusinessProfile, BusinessProfileProps } from '../../domain/entities/business-profile.entity';
import { BusinessProfileDTO } from '../dto/discussion-thread.dto';

export class BusinessProfileMapper {
    static toDTO(entity: BusinessProfile): BusinessProfileDTO {
        return {
            id: entity.id,
            userId: entity.userId,
            businessId: entity.businessId,
            expertiseAreas: entity.expertiseAreas.map(e => ({
                area: e.area,
                level: e.level,
                verifiedAt: e.verifiedAt?.toISOString(),
            })),
            industryExperience: entity.industryExperience,
            certifications: entity.certifications,
            contributionScore: entity.contributionScore,
            contributionMetrics: entity.contributionMetrics,
            reputationTier: entity.reputationTier,
            businessGoals: entity.businessGoals.map(g => ({
                description: g.description,
                targetDate: g.targetDate?.toISOString(),
                category: g.category,
            })),
            learningObjectives: entity.learningObjectives.map(o => ({
                topic: o.topic,
                priority: o.priority,
                targetCompletionDate: o.targetCompletionDate?.toISOString(),
            })),
            availableForMentorship: entity.availableForMentorship,
            mentorshipCapacity: entity.mentorshipCapacity,
            createdAt: entity.createdAt.toISOString(),
            updatedAt: entity.updatedAt.toISOString(),
        };
    }

    static toEntity(dto: BusinessProfileDTO): BusinessProfile {
        const props: BusinessProfileProps = {
            id: dto.id,
            userId: dto.userId,
            businessId: dto.businessId,
            expertiseAreas: dto.expertiseAreas.map(e => ({
                area: e.area,
                level: e.level as any,
                verifiedAt: e.verifiedAt ? new Date(e.verifiedAt) : undefined,
            })),
            industryExperience: dto.industryExperience,
            certifications: dto.certifications,
            contributionScore: dto.contributionScore,
            contributionMetrics: dto.contributionMetrics,
            reputationTier: dto.reputationTier as any,
            businessGoals: dto.businessGoals.map(g => ({
                description: g.description,
                targetDate: g.targetDate ? new Date(g.targetDate) : undefined,
                category: g.category,
            })),
            learningObjectives: dto.learningObjectives.map(o => ({
                topic: o.topic,
                priority: o.priority as any,
                targetCompletionDate: o.targetCompletionDate ? new Date(o.targetCompletionDate) : undefined,
            })),
            availableForMentorship: dto.availableForMentorship,
            mentorshipCapacity: dto.mentorshipCapacity,
            createdAt: new Date(dto.createdAt),
            updatedAt: new Date(dto.updatedAt),
        };

        return new BusinessProfile(props);
    }
}
