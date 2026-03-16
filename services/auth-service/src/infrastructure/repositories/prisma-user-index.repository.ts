import { PrismaClient } from '@prisma/client';

export class PrismaUserIndexRepository {
  constructor(private readonly prisma: PrismaClient) { }

  async upsertIndex(entry: { userId: string; indexType: string; value: string; }): Promise<void> {
    await this.prisma.auth_UserIndex.upsert({
      where: {
        userId_indexType: {
          userId: entry.userId,
          indexType: entry.indexType
        }
      },
      update: {
        value: entry.value
      },
      create: {
        userId: entry.userId,
        indexType: entry.indexType,
        value: entry.value
      }
    });
  }

  async findByValue(indexType: string, value: string): Promise<{ userId: string; indexType: string; value: string; createdAt: Date; } | null> {
    return this.prisma.auth_UserIndex.findFirst({
      where: {
        indexType,
        value
      }
    });
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.prisma.auth_UserIndex.deleteMany({
      where: { userId }
    });
  }
}
