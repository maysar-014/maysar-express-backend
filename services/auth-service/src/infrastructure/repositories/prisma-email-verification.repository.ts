import { PrismaClient } from '@prisma/client';
import { IEmailVerificationRepository } from '../../domain/repositories';

export class PrismaEmailVerificationRepository implements IEmailVerificationRepository {
  constructor(private readonly prisma: PrismaClient) { }

  async create(token: { id: string; userId: string; token: string; expiresAt: Date; }): Promise<void> {
    await this.prisma.auth_EmailVerificationToken.create({
      data: {
        id: token.id,
        userId: token.userId,
        token: token.token,
        expiresAt: token.expiresAt
      }
    });
  }

  async findByToken(token: string): Promise<{
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
    used: boolean;
  } | null> {
    return this.prisma.auth_EmailVerificationToken.findUnique({
      where: { token }
    });
  }

  async markAsUsed(tokenId: string): Promise<void> {
    await this.prisma.auth_EmailVerificationToken.update({
      where: { id: tokenId },
      data: { used: true }
    });
  }

  async deleteExpired(): Promise<number> {
    const result = await this.prisma.auth_EmailVerificationToken.deleteMany({
      where: { expiresAt: { lt: new Date() } }
    });
    return result.count;
  }
}
