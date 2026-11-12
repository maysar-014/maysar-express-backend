import prisma from '../../infrastructure/database/prisma';
import { SellerAnalyticsRepository } from '../../infrastructure/repositories/SellerAnalyticsRepository';

const WINDOW_DAYS = 30;

const percent = (numerator: number, denominator: number): number | null =>
    denominator === 0 ? null : Number(((numerator / denominator) * 100).toFixed(2));

const round2 = (value: number): number => Math.round(value * 100) / 100;

/**
 * Platform-level KPI summary for the admin dashboard.
 *
 * Serves `GET /api/analytics/platform/kpis` (and its `/platform/stats` alias),
 * the endpoints promised by the frontend admin guide (Flow 1: Platform KPIs).
 *
 * Every figure is computed LIVE from canonical tables over a trailing 30-day
 * window so it can never drift from the founder-OS dashboard, which reuses the
 * same repository methods. Rates return `null` (never a fake 0) when their
 * denominator has no data, so the UI can render an honest "—" state.
 */
export class GetPlatformKpis {
    constructor(private readonly repository: SellerAnalyticsRepository) {}

    async execute() {
        const now = new Date();
        const from = new Date(now);
        from.setDate(from.getDate() - WINDOW_DAYS);

        const [
            deliveredAggregate,
            orderCount,
            activeSellers,
            totalSellers,
            activeUsers,
            conversionRate,
            codCompleted,
            codCancelled,
            deliveriesDelivered,
            deliveriesUnsuccessful
        ] = await Promise.all([
            // GMV + delivered count in a single aggregate so AOV is consistent
            // with its own numerator and denominator.
            prisma.order_Order.aggregate({
                where: { status: 'DELIVERED', createdAt: { gte: from, lte: now } },
                _sum: { totalAmount: true },
                _count: { _all: true }
            }),
            this.repository.getOrdersCount(from, now),
            this.repository.getActiveSellersCount(WINDOW_DAYS),
            this.repository.getTotalSellersCount(),
            this.repository.getDailyActiveUsersCount(1),
            this.repository.getBuyerConversionRate(from, now),
            // COD acceptance: of COD orders that reached a terminal outcome,
            // the share that was delivered (vs. cancelled).
            prisma.order_Order.count({
                where: {
                    paymentMethod: 'COD',
                    status: { in: ['DELIVERED', 'COMPLETED'] },
                    createdAt: { gte: from, lte: now }
                }
            }),
            prisma.order_Order.count({
                where: {
                    paymentMethod: 'COD',
                    status: 'CANCELLED',
                    createdAt: { gte: from, lte: now }
                }
            }),
            // Delivery success: of courier deliveries that reached a terminal
            // outcome, the share that was delivered (vs. failed/cancelled).
            prisma.logistics_Delivery.count({
                where: { status: 'delivered', createdAt: { gte: from, lte: now } }
            }),
            prisma.logistics_Delivery.count({
                where: { status: { in: ['failed', 'cancelled'] }, createdAt: { gte: from, lte: now } }
            })
        ]);

        const gmv = Number(deliveredAggregate._sum.totalAmount || 0);
        const deliveredCount = deliveredAggregate._count._all;
        const averageOrderValue = deliveredCount === 0 ? null : round2(gmv / deliveredCount);

        return {
            windowDays: WINDOW_DAYS,
            gmv,
            activeUsers,
            activeSellers: Array.isArray(activeSellers) ? activeSellers.length : Number(activeSellers),
            totalSellers,
            orderCount,
            conversionRate,
            averageOrderValue,
            codAcceptanceRate: percent(codCompleted, codCompleted + codCancelled),
            deliverySuccessRate: percent(deliveriesDelivered, deliveriesDelivered + deliveriesUnsuccessful),
            computedAt: now.toISOString()
        };
    }
}