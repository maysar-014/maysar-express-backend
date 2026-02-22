export interface FinancialMetrics {
  avgPayoutTimeHours: number;
  avgWithdrawalTimeHours: number;
  disputesPer100Orders: number;
}

export interface PayoutTimingData {
  payoutId: string;
  createdAt: Date;
  completedAt: Date;
}

export interface DisputeData {
  ticketId: string;
  category: string;
  status: string;
}

export class FinancialMetricsEngine {
  calculatePayoutTime(payoutData: PayoutTimingData[]): number {
    if (payoutData.length === 0) return 0;

    const totalHours = payoutData.reduce((sum, payout) => {
      const hours = (payout.completedAt.getTime() - payout.createdAt.getTime()) / (1000 * 60 * 60);
      return sum + hours;
    }, 0);

    return totalHours / payoutData.length;
  }

  calculateWithdrawalTime(withdrawalData: PayoutTimingData[]): number {
    // Same calculation as payout time for now
    return this.calculatePayoutTime(withdrawalData);
  }

  calculateDisputeRate(disputeData: DisputeData[], totalOrders: number): number {
    if (totalOrders === 0) return 0;

    const commissionDisputes = disputeData.filter(
      dispute =>
        ['commission', 'deduction', 'payout'].includes(dispute.category.toLowerCase()) &&
        ['OPEN', 'IN_PROGRESS'].includes(dispute.status)
    ).length;

    return (commissionDisputes / totalOrders) * 100;
  }

  calculateMetrics(
    payoutData: PayoutTimingData[],
    withdrawalData: PayoutTimingData[],
    disputeData: DisputeData[],
    totalOrders: number
  ): FinancialMetrics {
    return {
      avgPayoutTimeHours: this.calculatePayoutTime(payoutData),
      avgWithdrawalTimeHours: this.calculateWithdrawalTime(withdrawalData),
      disputesPer100Orders: this.calculateDisputeRate(disputeData, totalOrders)
    };
  }
}
