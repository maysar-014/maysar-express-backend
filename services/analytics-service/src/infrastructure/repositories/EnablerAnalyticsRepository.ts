import prisma from '../database/prisma';
import { Prisma } from '@prisma/client';

export class EnablerAnalyticsRepository {
    async updateAnalytics(enablerId: string, data: Prisma.Analytics_EnablerAnalyticsUpdateInput) {
        return prisma.analytics_EnablerAnalytics.upsert({
            where: { enablerId },
            update: data,
            create: {
                ...data as Prisma.Analytics_EnablerAnalyticsCreateInput,
                enablerId,
                createdAt: new Date()
            }
        });
    }
}
