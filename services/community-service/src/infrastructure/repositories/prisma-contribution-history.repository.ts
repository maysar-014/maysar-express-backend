import { PrismaClient } from '@prisma/client';

export interface CommunityContributionHistory {
  id: string;
  userId: string;
  actionType: string;
  contentId: string;
  contentType: string;
  pointsEarned: number;
  qualityScore?: number;
  createdAt: Date;
}

export class PrismaContributionHistoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(entry: CommunityContributionHistory): Promise<void> {
    await this.prisma.community_ContributionHistory.create({
      data: {
        id: entry.id,
        userId: entry.userId,
        actionType: entry.actionType,
        contentId: entry.contentId,
        contentType: entry.contentType,
        pointsEarned: entry.pointsEarned,
        qualityScore: entry.qualityScore ?? null,
        createdAt: entry.createdAt
      }
    });
  }

  async findByUserId(userId: string, limit = 50): Promise<CommunityContributionHistory[]> {
    const rows = await this.prisma.community_ContributionHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
    return rows.map(row => this.toDomain(row));
  }

  private toDomain(row: any): CommunityContributionHistory {
    return {
      id: row.id,
      userId: row.userId,
      actionType: row.actionType,
      contentId: row.contentId,
      contentType: row.contentType,
      pointsEarned: row.pointsEarned,
      qualityScore: row.qualityScore ?? undefined,
      createdAt: row.createdAt
    };
  }
}
