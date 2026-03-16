import { PrismaClient } from '@prisma/client';

export interface SessionRecord {
  id: string;
  userId: string;
  token: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * SessionRepository
 * Minimal Prisma-backed repository for auth sessions (auth_sessions)
 */
export class SessionRepository {
  private readonly defaultTtlMs = 60 * 60 * 1000; // 1 hour

  constructor(private readonly prisma: PrismaClient) { }

  async create(input: {
    id?: string;
    userId: string;
    token: string;
    ipAddress?: string;
    userAgent?: string;
    expiresAt?: Date;
  }): Promise<SessionRecord> {
    const expiresAt = input.expiresAt ?? new Date(Date.now() + this.defaultTtlMs);
    return this.prisma.session.create({
      data: {
        id: input.id,
        userId: input.userId,
        token: input.token,
        ipAddress: input.ipAddress || 'unknown',
        userAgent: input.userAgent || 'unknown',
        expiresAt
      }
    });
  }

  async findById(id: string): Promise<SessionRecord | null> {
    return this.prisma.session.findUnique({
      where: { id }
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.session.delete({
      where: { id }
    });
  }
}
