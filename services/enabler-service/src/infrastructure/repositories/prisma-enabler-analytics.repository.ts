import { IEnablerAnalyticsRepository } from '../../domain/repositories/enabler-analytics.repository.interface';
import prisma from '../database/prisma-client';

export class PrismaEnablerAnalyticsRepository implements IEnablerAnalyticsRepository {
  async upsertInitial(enablerId: string): Promise<void> {
    await prisma.enabler_Analytics.upsert({
      where: { enablerId },
      update: {
        lastActivityAt: new Date(),
        updatedAt: new Date()
      },
      create: {
        enablerId
      }
    });
  }
}
