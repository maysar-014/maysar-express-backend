import { PrismaClient } from '@prisma/client';
import { IPasswordResetRepository } from '../../domain/repositories';

export class PrismaPasswordResetRepository implements IPasswordResetRepository {
  constructor(private readonly prisma: PrismaClient) { }

  async create(token: { id: string; userId: string; token: string; expiresAt: Date; }): Promise<void> {
    await this.prisma.auth_PasswordResetToken.create({
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
    return this.prisma.auth_PasswordResetToken.findUnique({
      where: { token }
    });
  }

  async markAsUsed(tokenId: string): Promise<void> {
    await this.prisma.auth_PasswordResetToken.update({
      where: { id: tokenId },
      data: { used: true }
    });
  }

  async deleteExpired(): Promise<number> {
    const result = await this.prisma.auth_PasswordResetToken.deleteMany({
      where: { expiresAt: { lt: new Date() } }
    });
    return result.count;
  }
}
