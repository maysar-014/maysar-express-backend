import prisma from '../database/prisma';
import { Prisma } from '@prisma/client';

export class CourierAnalyticsRepository {
    async getAnalytics(courierId: string) {
        return prisma.analytics_CourierAnalytics.findFirst({
            where: { courierId }
        });
    }

    async updateAnalytics(courierId: string, data: Prisma.Analytics_CourierAnalyticsUpdateInput) {
        return prisma.analytics_CourierAnalytics.upsert({
            where: { courierId },
            update: data,
            create: {
                ...data as Prisma.Analytics_CourierAnalyticsCreateInput,
                courierId,
                createdAt: new Date() // Original code set createdAt on create
            }
        });
    }
}
