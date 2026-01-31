import prisma from '../database/prisma';

export class SupplierAnalyticsRepository {
    async getAnalytics(supplierId: string) {
        return prisma.supplierAnalytics.findFirst({
            where: { supplierId }
        });
    }

    async updateAnalytics(supplierId: string, data: any) {
        return prisma.supplierAnalytics.upsert({
            where: { supplierId },
            update: data,
            create: {
                supplierId,
                ...data,
                createdAt: new Date()
            }
        });
    }
}
