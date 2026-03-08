import { PrismaClient, Prisma } from '@prisma/client';
import { BusinessChallenge } from '../../domain/entities/business-challenge.entity';
import {
    BusinessChallengeRepository
} from '../../application/use-cases/propose-business-challenge.use-case';

export class PrismaBusinessChallengeRepository implements BusinessChallengeRepository {
    constructor(private readonly prisma: PrismaClient) { }

    async save(challenge: BusinessChallenge): Promise<BusinessChallenge> {
        const data = {
            id: challenge.id,
            proposerId: challenge.proposerId,
            title: challenge.title,
            description: challenge.description,
            category: challenge.category,
            industryTags: challenge.industryTags,
            constraints: challenge.constraints,
            successCriteria: challenge.successCriteria as unknown as Prisma.InputJsonValue,
            status: challenge.status as any,
            deadline: challenge.deadline,
            acceptedSolutionId: challenge.acceptedSolutionId,
            collaborators: challenge.collaborators,
            createdAt: challenge.createdAt,
            updatedAt: challenge.updatedAt,
            solvedAt: challenge.solvedAt,
        };

        const saved = await this.prisma.community_BusinessChallenge.upsert({
            where: { id: challenge.id },
            create: data as any,
            update: data as any,
        });

        return this.toDomain(saved);
    }

    async findSimilar(
        title: string,
        category: string,
        withinDays: number
    ): Promise<BusinessChallenge[]> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - withinDays);

        const challenges = await this.prisma.community_BusinessChallenge.findMany({
            where: {
                category,
                title: {
                    contains: title,
                    mode: 'insensitive',
                },
                createdAt: {
                    gte: cutoffDate,
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return challenges.map(c => this.toDomain(c));
    }

    private toDomain(record: any): BusinessChallenge {
        return new BusinessChallenge({
            id: record.id,
            proposerId: record.proposerId,
            title: record.title,
            description: record.description,
            category: record.category,
            industryTags: record.industryTags,
            constraints: record.constraints,
            successCriteria: record.successCriteria,
            status: record.status,
            deadline: record.deadline,
            acceptedSolutionId: record.acceptedSolutionId,
            collaborators: record.collaborators,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
            solvedAt: record.solvedAt,
        });
    }
}
