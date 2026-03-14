import { PrismaClient } from '@prisma/client';

export interface EmailVerificationTokenRecord {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  used: boolean;
}

export class PrismaEmailVerificationTokenRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(token: { id: string; userId: string; token: string; expiresAt: Date }): Promise<void> {
    await this.prisma.user_EmailVerificationToken.create({
      data: {
        id: token.id,
        userId: token.userId,
        token: token.token,
        expiresAt: token.expiresAt,
        used: false
      }
    });
  }

  async findByToken(token: string): Promise<EmailVerificationTokenRecord | null> {
    return this.prisma.user_EmailVerificationToken.findUnique({
      where: { token }
    });
  }

  async markAsUsed(tokenId: string): Promise<void> {
    await this.prisma.user_EmailVerificationToken.update({
      where: { id: tokenId },
      data: { used: true }
    });
  }

  async deleteExpired(): Promise<number> {
    const result = await this.prisma.user_EmailVerificationToken.deleteMany({
      where: { expiresAt: { lt: new Date() } }
    });
    return result.count;
  }
}
