import prisma from '../database/prisma';

export class SellerAnalyticsRepository {
    async getMetrics(sellerId: string) {
        return prisma.analytics_SellerMetrics.findFirst({
            where: { sellerId }
        });
    }

    async updateMetrics(sellerId: string, data: any) {
        return prisma.analytics_SellerMetrics.upsert({
            where: { sellerId },
            update: data,
            create: { sellerId, ...data }
        });
    }

    async getSalesData(sellerId: string) {
        return prisma.analytics_SalesAnalytics.findMany({
            where: { sellerId },
            orderBy: { date: 'desc' },
            take: 30
        });
    }

    async saveSalesAnalytics(sellerId: string, insights: any) {
        return prisma.analytics_SalesAnalytics.create({
            data: {
                sellerId,
                date: new Date(),
                insights: JSON.stringify(insights)
            }
        });
    }

    async getOrderDataBySeller(sellerId: string, startDate: Date, endDate: Date) {
        return prisma.order_Order.findMany({
            where: {
                sellerId,
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                items: true,
                settlements: true
            }
        });
    }

    async getSellerRevenueTrends(timeWindow: 'weekly' | 'monthly') {
        return prisma.order_Order.groupBy({
            by: ['sellerId'],
            where: {
                status: 'DELIVERED'
            },
            _sum: {
                totalAmount: true
            },
            _count: {
                id: true
            }
        });
    }

    async getProductVelocityData(sellerId?: string) {
        return prisma.order_OrderItem.groupBy({
            by: ['productId'],
            where: sellerId ? { order: { sellerId } } : undefined,
            _sum: {
                quantity: true
            },
            _count: {
                id: true
            }
        });
    }

    async getBuyerRetentionData() {
        return prisma.order_Order.groupBy({
            by: ['buyerId'],
            _count: {
                id: true
            }
        });
    }

    async getSellerActivityData(days: number) {
        const dateThreshold = new Date();
        dateThreshold.setDate(dateThreshold.getDate() - days);

        return prisma.user_User.findMany({
            where: {
                role: 'SELLER',
                createdAt: {
                    lte: dateThreshold
                }
            },
            select: {
                id: true,
                createdAt: true
            }
        });
    }

    async getPayoutTimingData(sellerId?: string) {
        return prisma.payout_Payout.findMany({
            where: {
                status: 'COMPLETED',
                ...(sellerId && { userId: sellerId })
            },
            select: {
                id: true,
                createdAt: true,
                completedAt: true
            }
        });
    }

    async getCommissionDisputeData() {
        return prisma.support_Ticket.findMany({
            where: {
                category: {
                    in: ['commission', 'deduction', 'payout']
                },
                status: {
                    in: ['OPEN', 'IN_PROGRESS']
                }
            },
            select: {
                id: true,
                category: true,
                status: true
            }
        });
    }

    async getProductExpansionData() {
        return prisma.catalog_Product.findMany({
            select: {
                id: true,
                sellerId: true,
                createdAt: true
            }
        });
    }

    async getReferralData() {
        return prisma.commission_Referral.findMany({
            select: {
                id: true,
                referrerId: true,
                status: true
            }
        });
    }

    async getTotalOrderCount() {
        return prisma.order_Order.count();
    }

    async getActiveSellersCount(days: number = 30) {
        const dateThreshold = new Date();
        dateThreshold.setDate(dateThreshold.getDate() - days);

        return prisma.order_Order.findMany({
            where: {
                createdAt: {
                    gte: dateThreshold
                },
                status: 'DELIVERED'
            },
            distinct: ['sellerId'],
            select: {
                sellerId: true
            }
        });
    }

    async getGMV(startDate: Date, endDate: Date) {
        const result = await prisma.order_Order.aggregate({
            where: {
                status: 'DELIVERED',
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            },
            _sum: {
                totalAmount: true
            }
        });
        return result._sum.totalAmount || 0;
    }
}
