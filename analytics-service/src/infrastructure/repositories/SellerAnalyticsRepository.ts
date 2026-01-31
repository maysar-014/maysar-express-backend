import prisma from '../database/prisma';

export class SellerAnalyticsRepository {
    async getMetrics(sellerId: string) {
        return prisma.sellerMetrics.findFirst({
            where: { sellerId }
        });
    }

    async updateMetrics(sellerId: string, data: any) {
        return prisma.sellerMetrics.upsert({
            where: { sellerId },
            update: data,
            create: { sellerId, ...data }
        });
    }

    async getSalesData(sellerId: string) {
        return prisma.salesAnalytics.findMany({
            where: { sellerId },
            orderBy: { date: 'desc' },
            take: 30
        });
    }

    async saveSalesAnalytics(sellerId: string, insights: any) {
        return prisma.salesAnalytics.create({
            data: {
                sellerId,
                date: new Date(),
                insights: JSON.stringify(insights) // Assuming insights is stored as JSON string based on original code
            }
        });
    }
}
