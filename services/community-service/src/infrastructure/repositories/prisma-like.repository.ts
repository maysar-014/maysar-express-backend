import { PrismaClient } from '@prisma/client';
import { ILikeRepository, Like } from '../../domain/repositories';

export class PrismaLikeRepository implements ILikeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByUserAndEntity(userId: string, entityType: 'post' | 'comment', entityId: string): Promise<Like | null> {
    const where =
      entityType === 'post'
        ? { userId, postId: entityId }
        : { userId, commentId: entityId };

    const row = await this.prisma.community_Like.findFirst({ where });
    return row ? this.toDomain(row) : null;
  }

  async findByEntity(entityType: 'post' | 'comment', entityId: string): Promise<Like[]> {
    const where =
      entityType === 'post'
        ? { postId: entityId }
        : { commentId: entityId };

    const rows = await this.prisma.community_Like.findMany({ where, orderBy: { createdAt: 'desc' } });
    return rows.map(row => this.toDomain(row));
  }

  async save(like: Like): Promise<void> {
    await this.prisma.community_Like.create({
      data: {
        id: like.id,
        userId: like.userId,
        postId: like.postId ?? null,
        commentId: like.commentId ?? null,
        type: like.type,
        createdAt: like.createdAt
      }
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.community_Like.delete({ where: { id } });
  }

  async countByEntity(entityType: 'post' | 'comment', entityId: string): Promise<number> {
    const where =
      entityType === 'post'
        ? { postId: entityId }
        : { commentId: entityId };

    return this.prisma.community_Like.count({ where });
  }

  private toDomain(row: any): Like {
    return {
      id: row.id,
      userId: row.userId,
      postId: row.postId ?? undefined,
      commentId: row.commentId ?? undefined,
      type: row.type,
      createdAt: row.createdAt
    };
  }
}
