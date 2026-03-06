import { PrismaClient, Prisma } from '@prisma/client';
import { BusinessProfile } from '../../domain/entities/business-profile.entity';
import {
    BusinessProfileRepository
} from '../../application/use-cases/create-discussion-thread.use-case';
import { ReputationTier } from '../../domain/entities/business-profile.entity';

export class PrismaBusinessProfileRepository implements BusinessProfileRepository {
    constructor(private readonly prisma: PrismaClient) { }

    async save(profile: BusinessProfile): Promise<BusinessProfile> {
        const data = {
            id: profile.id,
            userId: profile.userId,
            businessId: profile.businessId,
            expertiseAreas: profile.expertiseAreas as unknown as Prisma.InputJsonValue,
            industryExperience: profile.industryExperience,
            certifications: profile.certifications,
            contributionScore: profile.contributionScore,
            contributionMetrics: profile.contributionMetrics as unknown as Prisma.InputJsonValue,
            reputationTier: profile.reputationTier,
            businessGoals: profile.businessGoals as unknown as Prisma.InputJsonValue,
            learningObjectives: profile.learningObjectives as unknown as Prisma.InputJsonValue,
            availableForMentorship: profile.availableForMentorship,
            mentorshipCapacity: profile.mentorshipCapacity,
            createdAt: profile.createdAt,
            updatedAt: profile.updatedAt,
        };

        const saved = await this.prisma.community_BusinessProfile.upsert({
            where: { userId: profile.userId },
            create: data,
            update: data,
        });

        return this.toDomain(saved);
    }

    async findByUserId(userId: string): Promise<BusinessProfile | null> {
        const profile = await this.prisma.community_BusinessProfile.findUnique({
            where: { userId },
        });

        return profile ? this.toDomain(profile) : null;
    }

    async findById(id: string): Promise<BusinessProfile | null> {
        const profile = await this.prisma.community_BusinessProfile.findUnique({
            where: { id },
        });

        return profile ? this.toDomain(profile) : null;
    }

    private toDomain(record: any): BusinessProfile {
        return new BusinessProfile({
            id: record.id,
            userId: record.userId,
            businessId: record.businessId,
            expertiseAreas: record.expertiseAreas,
            industryExperience: record.industryExperience,
            certifications: record.certifications,
            contributionScore: record.contributionScore,
            contributionMetrics: record.contributionMetrics,
            reputationTier: record.reputationTier as ReputationTier,
            businessGoals: record.businessGoals,
            learningObjectives: record.learningObjectives,
            availableForMentorship: record.availableForMentorship,
            mentorshipCapacity: record.mentorshipCapacity,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
        });
    }
}
