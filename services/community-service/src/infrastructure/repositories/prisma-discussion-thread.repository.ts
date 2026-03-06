import { PrismaClient, Prisma } from '@prisma/client';
import { DiscussionThread } from '../../domain/entities/discussion-thread.entity';
import {
    DiscussionThreadRepository
} from '../../application/use-cases/create-discussion-thread.use-case';

export class PrismaDiscussionThreadRepository implements DiscussionThreadRepository {
    constructor(private readonly prisma: PrismaClient) { }

    async save(thread: DiscussionThread): Promise<DiscussionThread> {
        const data = {
            id: thread.id,
            authorId: thread.authorId,
            topic: thread.topic,
            content: thread.content,
            category: thread.category,
            status: thread.status,
            expertiseLevel: thread.expertiseLevel,
            businessContext: thread.businessContext as unknown as Prisma.InputJsonValue,
            maxResponsesPerUser: thread.maxResponsesPerUser,
            acceptedAnswerId: thread.acceptedAnswerId,
            resolvedAt: thread.resolvedAt,
            createdAt: thread.createdAt,
            updatedAt: thread.updatedAt,
        };

        const saved = await this.prisma.community_DiscussionThread.upsert({
            where: { id: thread.id },
            create: data,
            update: data,
        });

        return this.toDomain(saved);
    }

    async findById(id: string): Promise<DiscussionThread | null> {
        const thread = await this.prisma.community_DiscussionThread.findUnique({
            where: { id },
        });

        return thread ? this.toDomain(thread) : null;
    }

    async findDuplicates(
        topic: string,
        authorId: string,
        withinHours: number
    ): Promise<DiscussionThread[]> {
        const cutoffDate = new Date();
        cutoffDate.setHours(cutoffDate.getHours() - withinHours);

        const threads = await this.prisma.community_DiscussionThread.findMany({
            where: {
                authorId,
                topic: {
                    contains: topic,
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

        return threads.map(t => this.toDomain(t));
    }

    async getUserResponseCount(threadId: string, userId: string): Promise<number> {
        return this.prisma.community_ThreadAnswer.count({
            where: {
                threadId,
                authorId: userId,
            },
        });
    }

    private toDomain(record: any): DiscussionThread {
        return new DiscussionThread({
            id: record.id,
            authorId: record.authorId,
            topic: record.topic,
            content: record.content,
            category: record.category,
            status: record.status,
            expertiseLevel: record.expertiseLevel,
            businessContext: record.businessContext,
            maxResponsesPerUser: record.maxResponsesPerUser,
            acceptedAnswerId: record.acceptedAnswerId,
            resolvedAt: record.resolvedAt,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
        });
    }
}
