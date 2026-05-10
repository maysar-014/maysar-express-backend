import prisma from '../database/prisma';
import { Prisma } from '@prisma/client';

export class SellerAnalyticsRepository {
    async getMetrics(sellerId: string) {
        return prisma.analytics_SellerMetrics.findFirst({
            where: { sellerId }
        });
    }

    async updateMetrics(sellerId: string, data: Prisma.Analytics_SellerMetricsUpdateInput) {
        return prisma.analytics_SellerMetrics.upsert({
            where: { sellerId },
            update: data,
            create: { ...data as Prisma.Analytics_SellerMetricsCreateInput, sellerId }
        });
    }

    async getSalesData(sellerId: string) {
        return prisma.analytics_SalesAnalytics.findMany({
            where: { sellerId },
            orderBy: { date: 'desc' },
            take: 30
        });
    }

    async saveSalesAnalytics(sellerId: string, insights: Record<string, unknown>) {
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

    async getSellerRevenueTrends(_timeWindow: 'weekly' | 'monthly') {
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
        return prisma.payout.findMany({
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
        return prisma.product.findMany({
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

    async getOrdersCount(startDate: Date, endDate: Date) {
        return prisma.order_Order.count({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });
    }

    async getCheckoutSessionCount(startDate: Date, endDate: Date) {
        const delegate = (prisma as any).checkout_CheckoutSession;
        if (!delegate || typeof delegate.count !== 'function') {
            return 0;
        }

        return delegate.count({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });
    }

    async getBuyerConversionRate(startDate: Date, endDate: Date) {
        const [orders, checkouts] = await Promise.all([
            this.getOrdersCount(startDate, endDate),
            this.getCheckoutSessionCount(startDate, endDate)
        ]);

        if (checkouts === 0) {
            return 0;
        }

        return Number(((orders / checkouts) * 100).toFixed(2));
    }

    async getDailyActiveUsersCount(days: number = 1) {
        const threshold = new Date();
        threshold.setDate(threshold.getDate() - days);

        const delegate = (prisma as any).user_Session;
        if (!delegate || typeof delegate.findMany !== 'function') {
            return 0;
        }

        const sessions = await delegate.findMany({
            where: {
                createdAt: {
                    gte: threshold
                }
            },
            distinct: ['userId'],
            select: {
                userId: true
            }
        });

        return sessions.length;
    }

    async getTotalSellersCount() {
        return prisma.user_User.count({
            where: {
                role: 'SELLER'
            }
        });
    }

    async getSupportTicketsCreatedCount(startDate: Date, endDate: Date) {
        return prisma.support_Ticket.count({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });
    }

    async getSupportTicketsResolvedCount(startDate: Date, endDate: Date) {
        return prisma.support_Ticket.count({
            where: {
                resolvedAt: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });
    }

    async getOpenSupportTicketsCount() {
        return prisma.support_Ticket.count({
            where: {
                status: {
                    in: ['OPEN', 'IN_PROGRESS']
                }
            }
        });
    }

    async getSellerMetricsRollup() {
        const aggregate = await prisma.analytics_SellerMetrics.aggregate({
            _avg: {
                conversionRate: true,
                cartAbandonment: true,
                pendingCustomerQuestions: true
            },
            _sum: {
                lowConversionProductCount: true
            }
        });

        return {
            avgConversionRate: aggregate._avg.conversionRate ?? 0,
            avgCartAbandonment: aggregate._avg.cartAbandonment ?? 0,
            avgPendingCustomerQuestions: aggregate._avg.pendingCustomerQuestions ?? 0,
            totalLowConversionProducts: aggregate._sum.lowConversionProductCount ?? 0
        };
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
