import { PrismaClient } from '@prisma/client';

export interface CommunityShare {
  id: string;
  userId: string;
  postId: string;
  platform?: string;
  createdAt: Date;
}

export class PrismaShareRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByUserId(userId: string): Promise<CommunityShare[]> {
    const rows = await this.prisma.community_Share.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    return rows.map(row => this.toDomain(row));
  }

  async findByPostId(postId: string): Promise<CommunityShare[]> {
    const rows = await this.prisma.community_Share.findMany({
      where: { postId },
      orderBy: { createdAt: 'desc' }
    });
    return rows.map(row => this.toDomain(row));
  }

  async save(share: CommunityShare): Promise<void> {
    await this.prisma.community_Share.create({
      data: {
        id: share.id,
        userId: share.userId,
        postId: share.postId,
        platform: share.platform ?? null,
        createdAt: share.createdAt
      }
    });
  }

  private toDomain(row: any): CommunityShare {
    return {
      id: row.id,
      userId: row.userId,
      postId: row.postId,
      platform: row.platform ?? undefined,
      createdAt: row.createdAt
    };
  }
}
