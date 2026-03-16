import { Prisma, PrismaClient } from '@prisma/client';

export interface CommunityHashtag {
  id: string;
  name: string;
  usageCount: number;
  trendingScore: number;
  lastUsedAt: Date;
  createdAt: Date;
}

export class PrismaHashtagRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByName(name: string): Promise<CommunityHashtag | null> {
    const row = await this.prisma.community_Hashtag.findUnique({ where: { name } });
    return row ? this.toDomain(row) : null;
  }

  async upsert(name: string): Promise<CommunityHashtag> {
    const now = new Date();
    const row = await this.prisma.community_Hashtag.upsert({
      where: { name },
      update: { lastUsedAt: now, usageCount: { increment: 1 } },
      create: {
        name,
        usageCount: 1,
        trendingScore: new Prisma.Decimal(0),
        lastUsedAt: now
      }
    });
    return this.toDomain(row);
  }

  async incrementUsage(name: string): Promise<void> {
    await this.prisma.community_Hashtag.update({
      where: { name },
      data: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date()
      }
    });
  }

  private toDomain(row: any): CommunityHashtag {
    return {
      id: row.id,
      name: row.name,
      usageCount: row.usageCount,
      trendingScore: Number(row.trendingScore ?? 0),
      lastUsedAt: row.lastUsedAt,
      createdAt: row.createdAt
    };
  }
}
