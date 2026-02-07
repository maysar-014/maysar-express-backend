import { PrismaClient } from '@prisma/client';
import { KnowledgeArticle } from '../../domain/entities/knowledge-article.entity';
import {
    KnowledgeArticleRepository
} from '../../application/use-cases/submit-knowledge-article.use-case';

export class PrismaKnowledgeArticleRepository implements KnowledgeArticleRepository {
    constructor(private readonly prisma: PrismaClient) { }

    async save(article: KnowledgeArticle): Promise<KnowledgeArticle> {
        const data = {
            id: article.id,
            authorId: article.authorId,
            title: article.title,
            summary: article.summary,
            sections: article.sections,
            category: article.category,
            industryTags: article.industryTags,
            expertiseLevel: article.expertiseLevel,
            reviewStatus: article.reviewStatus,
            qualityScore: article.qualityScore,
            version: article.version,
            trainingModuleId: article.trainingModuleId,
            publishedAt: article.publishedAt,
            createdAt: article.createdAt,
            updatedAt: article.updatedAt,
        };

        const saved = await this.prisma.community_KnowledgeArticle.upsert({
            where: { id: article.id },
            create: data,
            update: data,
        });

        return this.toDomain(saved);
    }

    async findByTitleAndAuthor(
        title: string,
        authorId: string
    ): Promise<KnowledgeArticle | null> {
        const article = await this.prisma.community_KnowledgeArticle.findFirst({
            where: {
                title,
                authorId,
            },
        });

        return article ? this.toDomain(article) : null;
    }

    async findById(id: string): Promise<KnowledgeArticle | null> {
        const article = await this.prisma.community_KnowledgeArticle.findUnique({
            where: { id },
        });

        return article ? this.toDomain(article) : null;
    }

    private toDomain(record: any): KnowledgeArticle {
        return new KnowledgeArticle({
            id: record.id,
            authorId: record.authorId,
            title: record.title,
            summary: record.summary,
            sections: record.sections,
            category: record.category,
            industryTags: record.industryTags,
            expertiseLevel: record.expertiseLevel,
            reviewStatus: record.reviewStatus,
            qualityScore: record.qualityScore,
            version: record.version,
            trainingModuleId: record.trainingModuleId,
            publishedAt: record.publishedAt,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
        });
    }
}
