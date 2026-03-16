import { PrismaClient } from '@prisma/client';

export interface CommunityArticleReview {
  id: string;
  articleId: string;
  reviewerId: string;
  score: number;
  feedback: string;
  approved: boolean;
  createdAt: Date;
}

export class PrismaArticleReviewRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(review: CommunityArticleReview): Promise<void> {
    await this.prisma.community_ArticleReview.create({
      data: {
        id: review.id,
        articleId: review.articleId,
        reviewerId: review.reviewerId,
        score: review.score,
        feedback: review.feedback,
        approved: review.approved,
        createdAt: review.createdAt
      }
    });
  }

  async findByArticleId(articleId: string): Promise<CommunityArticleReview[]> {
    const rows = await this.prisma.community_ArticleReview.findMany({
      where: { articleId },
      orderBy: { createdAt: 'desc' }
    });
    return rows.map(row => this.toDomain(row));
  }

  private toDomain(row: any): CommunityArticleReview {
    return {
      id: row.id,
      articleId: row.articleId,
      reviewerId: row.reviewerId,
      score: row.score,
      feedback: row.feedback,
      approved: row.approved,
      createdAt: row.createdAt
    };
  }
}
