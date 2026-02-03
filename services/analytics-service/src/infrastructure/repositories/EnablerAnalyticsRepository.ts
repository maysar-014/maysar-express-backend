import prisma from '../database/prisma';

export class EnablerAnalyticsRepository {
    async updateAnalytics(enablerId: string, data: any) {
        return prisma.enablerAnalytics.upsert({
            where: { enablerId },
            update: data,
            create: {
                enablerId,
                ...data,
                createdAt: new Date()
            }
        });
    }
}
