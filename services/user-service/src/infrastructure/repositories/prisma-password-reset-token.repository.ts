import { PrismaClient } from '@prisma/client';

export interface PasswordResetTokenRecord {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  used: boolean;
}

export class PrismaPasswordResetTokenRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(token: { id: string; userId: string; token: string; expiresAt: Date }): Promise<void> {
    await this.prisma.user_PasswordResetToken.create({
      data: {
        id: token.id,
        userId: token.userId,
        token: token.token,
        expiresAt: token.expiresAt,
        used: false
      }
    });
  }

  async findByToken(token: string): Promise<PasswordResetTokenRecord | null> {
    return this.prisma.user_PasswordResetToken.findUnique({
      where: { token }
    });
  }

  async markAsUsed(tokenId: string): Promise<void> {
    await this.prisma.user_PasswordResetToken.update({
      where: { id: tokenId },
      data: { used: true }
    });
  }

  async deleteExpired(): Promise<number> {
    const result = await this.prisma.user_PasswordResetToken.deleteMany({
      where: { expiresAt: { lt: new Date() } }
    });
    return result.count;
  }
}
