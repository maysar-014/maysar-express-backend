export interface SellerDashboardDTO {
  moneySnapshot: {
    todaySales: { amount: number; currency: string; orderCount: number };
    thisMonthRevenue: { amount: number; currency: string; growth: number };
    walletBalance: { available: number; pending: number; currency: string };
    nextPayoutDate: string | null;
    netPayout: number;
  };
  performanceInsights: {
    salesTrend: { data: Array<{ date: string; revenue: number }>; trend: 'up' | 'down' | 'flat' };
    repeatCustomers: { rate: number; message: string };
    bestProduct: { name: string; unitsSold: number; revenue: number };
  };
  actionCenter: Array<{
    id: string;
    type: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    title: string;
    description: string;
    productId?: string;
  }>;
  orders: {
    new: number;
    processing: number;
    shipped: number;
    completed: number;
    disputed: number;
  };
  payoutTransparency: {
    totalEarned: number;
    commissionDeducted: number;
    netPayout: number;
    nextPayoutDate: string | null;
    feeBreakdown: Array<{ type: string; amount: number }>;
  };
  inventoryHealth: {
    inStock: number;
    lowStock: number;
    outOfStock: number;
    alerts: Array<{ productName: string; daysLeft: number }>;
  };
  reputation: {
    averageRating: number;
    recentReviews: Array<{ rating: number; comment: string; date: string }>;
    responseRate: number;
    averageDeliveryTime: number;
  };
  profitabilityScore: {
    score: number;
    status: string;
    breakdown: {
      salesGrowth: number;
      repeatBuyers: number;
      responseTime: number;
      orderCompletion: number;
      inventoryStability: number;
    };
  };
  lastUpdated: Date;
}
