import prisma from '../database/prisma';

export class CourierAnalyticsRepository {
    async getAnalytics(courierId: string) {
        return prisma.courierAnalytics.findFirst({
            where: { courierId }
        });
    }

    async updateAnalytics(courierId: string, data: any) {
        return prisma.courierAnalytics.upsert({
            where: { courierId },
            update: data,
            create: {
                courierId,
                ...data,
                createdAt: new Date() // Original code set createdAt on create
            }
        });
    }
}
