import { PrismaClient } from '@prisma/client';

export interface CommunityBookmark {
  id: string;
  userId: string;
  postId: string;
  createdAt: Date;
}

export class PrismaBookmarkRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByUserId(userId: string): Promise<CommunityBookmark[]> {
    const rows = await this.prisma.community_Bookmark.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    return rows.map(row => this.toDomain(row));
  }

  async findByPostId(postId: string): Promise<CommunityBookmark[]> {
    const rows = await this.prisma.community_Bookmark.findMany({
      where: { postId },
      orderBy: { createdAt: 'desc' }
    });
    return rows.map(row => this.toDomain(row));
  }

  async save(bookmark: CommunityBookmark): Promise<void> {
    await this.prisma.community_Bookmark.create({
      data: {
        id: bookmark.id,
        userId: bookmark.userId,
        postId: bookmark.postId,
        createdAt: bookmark.createdAt
      }
    });
  }

  async delete(userId: string, postId: string): Promise<void> {
    await this.prisma.community_Bookmark.delete({
      where: { userId_postId: { userId, postId } }
    });
  }

  private toDomain(row: any): CommunityBookmark {
    return {
      id: row.id,
      userId: row.userId,
      postId: row.postId,
      createdAt: row.createdAt
    };
  }
}
