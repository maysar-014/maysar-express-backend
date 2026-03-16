import { PrismaClient } from '@prisma/client';
import { ICommentRepository, Comment } from '../../domain/repositories';

export class PrismaCommentRepository implements ICommentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Comment | null> {
    const row = await this.prisma.comment.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findByPostId(postId: string, options?: { limit?: number; offset?: number }): Promise<Comment[]> {
    const { limit = 50, offset = 0 } = options || {};
    const rows = await this.prisma.comment.findMany({
      where: { postId },
      orderBy: { createdAt: 'asc' },
      take: limit,
      skip: offset
    });
    return rows.map(row => this.toDomain(row));
  }

  async findByAuthorId(authorId: string, options?: { limit?: number; offset?: number }): Promise<Comment[]> {
    const { limit = 50, offset = 0 } = options || {};
    const rows = await this.prisma.comment.findMany({
      where: { authorId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });
    return rows.map(row => this.toDomain(row));
  }

  async save(comment: Comment): Promise<void> {
    await this.prisma.comment.upsert({
      where: { id: comment.id },
      update: this.toPrisma(comment),
      create: this.toPrisma(comment)
    });
  }

  async update(comment: Comment): Promise<void> {
    await this.prisma.comment.update({
      where: { id: comment.id },
      data: this.toPrisma(comment)
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.comment.update({
      where: { id },
      data: { status: 'deleted', updatedAt: new Date() }
    });
  }

  async getReplies(parentId: string): Promise<Comment[]> {
    const rows = await this.prisma.comment.findMany({
      where: { parentId },
      orderBy: { createdAt: 'asc' }
    });
    return rows.map(row => this.toDomain(row));
  }

  private toDomain(row: any): Comment {
    return {
      id: row.id,
      postId: row.postId,
      authorId: row.authorId,
      parentId: row.parentId ?? undefined,
      content: row.content,
      likesCount: row.likesCount,
      repliesCount: row.repliesCount,
      status: row.status,
      moderatedBy: row.moderatedBy ?? undefined,
      moderatedAt: row.moderatedAt ?? undefined,
      moderationReason: row.moderationReason ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  private toPrisma(comment: Comment): any {
    return {
      id: comment.id,
      postId: comment.postId,
      authorId: comment.authorId,
      parentId: comment.parentId ?? null,
      content: comment.content,
      likesCount: comment.likesCount,
      repliesCount: comment.repliesCount,
      status: comment.status,
      moderatedBy: comment.moderatedBy ?? null,
      moderatedAt: comment.moderatedAt ?? null,
      moderationReason: comment.moderationReason ?? null,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt
    };
  }
}
