import { PrismaClient } from '@prisma/client';
import { ISessionRepository } from '../../domain/repositories';

export class PrismaSessionRepository implements ISessionRepository {
  constructor(private readonly prisma: PrismaClient) { }

  async create(session: {
    id: string;
    userId: string;
    token: string;
    ipAddress: string;
    userAgent: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.session.create({
        data: {
          id: session.id,
          userId: session.userId,
          token: session.token,
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
          expiresAt: session.expiresAt
        }
      });

      const userSessionDelegate = (tx as any).user_Session;
      if (userSessionDelegate) {
        await userSessionDelegate.create({
          data: {
            id: session.id,
            userId: session.userId,
            token: session.token,
            ipAddress: session.ipAddress,
            userAgent: session.userAgent,
            expiresAt: session.expiresAt
          }
        });
      }
    });
  }

  async findByToken(token: string): Promise<{
    id: string;
    userId: string;
    token: string;
    ipAddress: string;
    userAgent: string;
    createdAt: Date;
    expiresAt: Date;
  } | null> {
    return this.prisma.session.findUnique({
      where: { token }
    });
  }

  async findByUserId(userId: string): Promise<Array<{
    id: string;
    userId: string;
    token: string;
    ipAddress: string;
    userAgent: string;
    createdAt: Date;
    expiresAt: Date;
  }>> {
    return this.prisma.session.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async deleteByToken(token: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.session.deleteMany({
        where: { token }
      });

      const userSessionDelegate = (tx as any).user_Session;
      if (userSessionDelegate) {
        await userSessionDelegate.deleteMany({
          where: { token }
        });
      }
    });
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.session.deleteMany({
        where: { userId }
      });

      const userSessionDelegate = (tx as any).user_Session;
      if (userSessionDelegate) {
        await userSessionDelegate.deleteMany({
          where: { userId }
        });
      }
    });
  }

  async updateExpiresAt(token: string, expiresAt: Date): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.session.updateMany({
        where: { token },
        data: { expiresAt }
      });

      const userSessionDelegate = (tx as any).user_Session;
      if (userSessionDelegate) {
        await userSessionDelegate.updateMany({
          where: { token },
          data: { expiresAt }
        });
      }
    });
  }

  async deleteExpired(): Promise<number> {
    const result = await this.prisma.session.deleteMany({
      where: { expiresAt: { lt: new Date() } }
    });
    const userSessionDelegate = (this.prisma as any).user_Session;
    if (userSessionDelegate) {
      await userSessionDelegate.deleteMany({
        where: { expiresAt: { lt: new Date() } }
      });
    }
    return result.count;
  }

  async countActiveSessions(userId: string): Promise<number> {
    return this.prisma.session.count({
      where: {
        userId,
        expiresAt: { gt: new Date() }
      }
    });
  }
}
