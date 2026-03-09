import type { SellerDashboardDTO } from './seller-dashboard.dto';

describe('seller-dashboard DTO contracts', () => {
  it('supports full seller dashboard payload shape', () => {
    const dto: SellerDashboardDTO = {
      moneySnapshot: {
        todaySales: { amount: 250000, currency: 'TZS', orderCount: 8 },
        thisMonthRevenue: { amount: 5200000, currency: 'TZS', growth: 12.5 },
        walletBalance: { available: 900000, pending: 150000, currency: 'TZS' },
        nextPayoutDate: '2026-03-15',
        netPayout: 870000
      },
      performanceInsights: {
        salesTrend: { data: [{ date: '2026-03-01', revenue: 200000 }], trend: 'up' },
        repeatCustomers: { rate: 0.32, message: 'Strong retention' },
        bestProduct: { name: 'Product A', unitsSold: 52, revenue: 1040000 }
      },
      actionCenter: [
        {
          id: 'act-1',
          type: 'INVENTORY',
          priority: 'HIGH',
          title: 'Restock low inventory',
          description: 'Product A may stock out in 2 days',
          productId: 'prod-1'
        }
      ],
      orders: { new: 3, processing: 4, shipped: 8, completed: 120, disputed: 1 },
      payoutTransparency: {
        totalEarned: 1200000,
        commissionDeducted: 120000,
        netPayout: 1080000,
        nextPayoutDate: '2026-03-15',
        feeBreakdown: [{ type: 'commission', amount: 120000 }]
      },
      inventoryHealth: {
        inStock: 80,
        lowStock: 6,
        outOfStock: 1,
        alerts: [{ productName: 'Product A', daysLeft: 2 }]
      },
      reputation: {
        averageRating: 4.7,
        recentReviews: [{ rating: 5, comment: 'Excellent service', date: '2026-03-02' }],
        responseRate: 0.93,
        averageDeliveryTime: 1.8
      },
      profitabilityScore: {
        score: 88,
        status: 'healthy',
        breakdown: {
          salesGrowth: 20,
          repeatBuyers: 18,
          responseTime: 17,
          orderCompletion: 16,
          inventoryStability: 17
        }
      },
      lastUpdated: new Date('2026-03-08T00:00:00.000Z')
    };

    expect(dto.performanceInsights.salesTrend.trend).toBe('up');
    expect(dto.profitabilityScore.score).toBe(88);
  });
});
