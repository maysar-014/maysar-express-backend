export interface RedFlag {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  metric: string;
  currentValue: number;
  threshold: number;
}

export class RedFlagEngine {
  private thresholds = {
    arpsDeclineWeekly: 0.1, // 10% decline
    churnRateMonthly: 0.07, // 7%
    medianRevenueToArpsRatio: 0.5, // Median < 50% of ARPS
    payoutTimeHours: 24,
    disputesPer100Orders: 2,
    sellerRetention90Days: 0.6, // 60%
    productExpansionRate: 0.3 // 30%
  };

  detectRedFlags(metrics: {
    arpsWeekly?: number;
    arpsWeeklyPrevious?: number;
    churnRateMonthly: number;
    medianRevenue: number;
    arpsMonthly: number;
    payoutTimeHours: number;
    disputesPer100Orders: number;
    retentionRate90Days: number;
    productExpansionRate: number;
  }): RedFlag[] {
    const flags: RedFlag[] = [];

    // Check ARPS decline
    if (metrics.arpsWeekly && metrics.arpsWeeklyPrevious) {
      const decline = (metrics.arpsWeeklyPrevious - metrics.arpsWeekly) / metrics.arpsWeeklyPrevious;
      if (decline > this.thresholds.arpsDeclineWeekly) {
        flags.push({
          type: 'arps_decline',
          severity: 'high',
          message: `ARPS declined ${(decline * 100).toFixed(1)}% week-over-week`,
          metric: 'ARPS',
          currentValue: metrics.arpsWeekly,
          threshold: metrics.arpsWeeklyPrevious * (1 - this.thresholds.arpsDeclineWeekly)
        });
      }
    }

    // Check churn rate
    if (metrics.churnRateMonthly > this.thresholds.churnRateMonthly) {
      flags.push({
        type: 'high_churn',
        severity: 'high',
        message: `Monthly churn rate ${metrics.churnRateMonthly.toFixed(2)}% exceeds threshold`,
        metric: 'Churn Rate',
        currentValue: metrics.churnRateMonthly,
        threshold: this.thresholds.churnRateMonthly * 100
      });
    }

    // Check median revenue concentration
    const medianToArpsRatio = metrics.medianRevenue / metrics.arpsMonthly;
    if (medianToArpsRatio < this.thresholds.medianRevenueToArpsRatio) {
      flags.push({
        type: 'revenue_concentration',
        severity: 'medium',
        message: `Median revenue is ${(medianToArpsRatio * 100).toFixed(1)}% of ARPS - high concentration risk`,
        metric: 'Revenue Distribution',
        currentValue: medianToArpsRatio,
        threshold: this.thresholds.medianRevenueToArpsRatio
      });
    }

    // Check payout time
    if (metrics.payoutTimeHours > this.thresholds.payoutTimeHours) {
      flags.push({
        type: 'slow_payouts',
        severity: 'medium',
        message: `Average payout time ${metrics.payoutTimeHours.toFixed(1)} hours exceeds 24-hour target`,
        metric: 'Payout Time',
        currentValue: metrics.payoutTimeHours,
        threshold: this.thresholds.payoutTimeHours
      });
    }

    // Check dispute rate
    if (metrics.disputesPer100Orders > this.thresholds.disputesPer100Orders) {
      flags.push({
        type: 'high_disputes',
        severity: 'medium',
        message: `Dispute rate ${metrics.disputesPer100Orders.toFixed(2)} per 100 orders exceeds threshold`,
        metric: 'Dispute Rate',
        currentValue: metrics.disputesPer100Orders,
        threshold: this.thresholds.disputesPer100Orders
      });
    }

    // Check retention
    if (metrics.retentionRate90Days < this.thresholds.sellerRetention90Days * 100) {
      flags.push({
        type: 'low_retention',
        severity: 'critical',
        message: `90-day seller retention ${metrics.retentionRate90Days.toFixed(1)}% is below 60% threshold`,
        metric: 'Seller Retention',
        currentValue: metrics.retentionRate90Days,
        threshold: this.thresholds.sellerRetention90Days * 100
      });
    }

    // Check product expansion
    if (metrics.productExpansionRate < this.thresholds.productExpansionRate * 100) {
      flags.push({
        type: 'low_expansion',
        severity: 'low',
        message: `Product expansion rate ${metrics.productExpansionRate.toFixed(1)}% is below 30% target`,
        metric: 'Product Expansion',
        currentValue: metrics.productExpansionRate,
        threshold: this.thresholds.productExpansionRate * 100
      });
    }

    return flags;
  }
}
