export interface EarningsEntity {
  id: string;
  courierId: string;
  deliveryId: string;
  baseFare: number;
  distanceFee: number;
  weightFee: number;
  priorityFee: number;
  totalEarnings: number;
  commission: number;
  netEarnings: number;
  paymentStatus: 'pending' | 'paid' | 'failed';
  paymentDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface EarningsRepositoryPort {
  save(earnings: EarningsEntity): Promise<void>;
  findByCourierId(courierId: string, timeRange?: { start: Date; end: Date }): Promise<EarningsEntity[]>;
  findByDeliveryId(deliveryId: string): Promise<EarningsEntity | null>;
  findAllEarnings(timeRange?: { start: Date; end: Date }): Promise<EarningsEntity[]>;
  updatePaymentStatus(id: string, status: 'pending' | 'paid' | 'failed', paymentDate?: Date): Promise<void>;
  getCourierEarningsSummary(courierId: string, period: { start: Date; end: Date }): Promise<{
    totalEarnings: number;
    totalDeliveries: number;
    averagePerDelivery: number;
    pendingPayments: number;
    paidPayments: number;
  }>;
  getPlatformEarningsSummary(period: { start: Date; end: Date }): Promise<{
    totalRevenue: number;
    totalCommissions: number;
    totalPayouts: number;
    netProfit: number;
    deliveryCount: number;
  }>;
}
