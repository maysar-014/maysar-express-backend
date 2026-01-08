export interface DailyEarnings {
  date: Date;
  baseEarnings: number;
  distanceBonus: number;
  timeBonus: number;
  performanceBonus: number;
  penalties: number;
  totalEarnings: number;
  deliveryCount: number;
  hoursWorked: number;
}

export interface WeeklyEarnings {
  weekStart: Date;
  weekEnd: Date;
  totalEarnings: number;
  dailyBreakdown: DailyEarnings[];
  averageDaily: number;
  bestDay: DailyEarnings;
}

export interface MonthlyEarnings {
  month: number;
  year: number;
  totalEarnings: number;
  weeklyBreakdown: WeeklyEarnings[];
  averageWeekly: number;
  growthRate: number;
}

export interface Payout {
  payoutId: string;
  courierId: string;
  amount: number;
  requestedAt: Date;
  processedAt?: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  method: 'bank_transfer' | 'mobile_money' | 'cash';
  reference?: string;
}

export interface PayoutHistory {
  payoutId: string;
  amount: number;
  processedAt: Date;
  method: string;
  status: string;
  reference: string;
}

export interface EarningsManagement {
  dailyEarnings: DailyEarnings;
  weeklyEarnings: WeeklyEarnings;
  monthlyEarnings: MonthlyEarnings;
  pendingPayouts: Payout[];
  payoutHistory: PayoutHistory[];
}

export interface PayoutRequest {
  courierId: string;
  amount: number;
  method: 'bank_transfer' | 'mobile_money' | 'cash';
  accountDetails?: Record<string, any>;
}

export interface PayoutResult {
  success: boolean;
  payoutId?: string;
  message: string;
  estimatedProcessingTime?: string;
  reference?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  message: string;
  processedAt: Date;
}

export interface PayoutStatus {
  payoutId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  estimatedCompletion?: Date;
  lastUpdate: Date;
}

export interface FailureHandling {
  retryAttempted: boolean;
  retryCount: number;
  nextRetryAt?: Date;
  escalated: boolean;
  resolution: string;
}

export interface Commission {
  deliveryId: string;
  baseCommission: number;
  bonusCommission: number;
  totalCommission: number;
  commissionRate: number;
  deliveryValue: number;
}

export interface Earnings {
  period: string;
  totalAmount: number;
  breakdown: EarningsBreakdown;
  payoutEligible: number;
  nextPayoutDate: Date;
}

export interface EarningsBreakdown {
  baseEarnings: number;
  distanceBonus: number;
  timeBonus: number;
  performanceBonus: number;
  penalties: number;
  totalEarnings: number;
}

export interface EarningsHistory {
  courierId: string;
  totalEarnings: number;
  monthlyHistory: MonthlyEarnings[];
  averageMonthly: number;
  bestMonth: MonthlyEarnings;
  growthTrend: 'increasing' | 'stable' | 'decreasing';
}

export interface Delivery {
  deliveryId: string;
  orderId: string;
  value: number;
  distance: number;
  duration: number;
  completedAt: Date;
  rating?: number;
}

export class EarningsManagementEngine {
  private readonly BASE_RATE = 2000; // TZS per delivery
  private readonly DISTANCE_RATE = 150; // TZS per km
  private readonly TIME_RATE = 50; // TZS per minute

  async calculateEarnings(courierId: string, period: string): Promise<Earnings> {
    const deliveries = await this.getDeliveriesForPeriod(courierId, period);
    const breakdown = await this.calculateEarningsBreakdown(deliveries);
    const payoutEligible = Math.max(0, breakdown.totalEarnings - 5000); // Minimum threshold
    
    return {
      period,
      totalAmount: breakdown.totalEarnings,
      breakdown,
      payoutEligible,
      nextPayoutDate: this.getNextPayoutDate()
    };
  }

  async processPayout(payoutRequest: PayoutRequest): Promise<PayoutResult> {
    const payoutProcessor = new PayoutProcessor();
    const validation = await payoutProcessor.validatePayoutRequest(payoutRequest);
    if (!validation.valid) {
      return {
        success: false,
        message: `Validation failed: ${validation.errors.join(', ')}`
      };
    }

    const payout: Payout = {
      payoutId: `payout_${Date.now()}`,
      courierId: payoutRequest.courierId,
      amount: payoutRequest.amount,
      requestedAt: new Date(),
      status: 'pending',
      method: payoutRequest.method
    };

    const paymentResult = await payoutProcessor.processPayment(payout);
    if (paymentResult.success) {
      payout.status = 'completed';
      payout.processedAt = paymentResult.processedAt;
      payout.reference = paymentResult.transactionId;
    }

    return {
      success: paymentResult.success,
      payoutId: payout.payoutId,
      message: paymentResult.message,
      estimatedProcessingTime: '2-4 hours',
      reference: payout.reference
    };
  }

  async getEarningsHistory(courierId: string): Promise<EarningsHistory> {
    const monthlyHistory = await this.getMonthlyEarningsHistory(courierId);
    const totalEarnings = monthlyHistory.reduce((sum, month) => sum + month.totalEarnings, 0);
    const averageMonthly = totalEarnings / Math.max(1, monthlyHistory.length);
    const bestMonth = monthlyHistory.reduce((best, current) => 
      current.totalEarnings > best.totalEarnings ? current : best, monthlyHistory[0]);

    return {
      courierId,
      totalEarnings,
      monthlyHistory,
      averageMonthly,
      bestMonth,
      growthTrend: this.calculateGrowthTrend(monthlyHistory)
    };
  }

  async calculateCommissions(deliveries: Delivery[]): Promise<Commission[]> {
    return deliveries.map(delivery => {
      const baseCommission = delivery.value * 0.15; // 15% base commission
      const bonusCommission = this.calculateBonusCommission(delivery);
      const totalCommission = baseCommission + bonusCommission;

      return {
        deliveryId: delivery.deliveryId,
        baseCommission,
        bonusCommission,
        totalCommission,
        commissionRate: (totalCommission / delivery.value) * 100,
        deliveryValue: delivery.value
      };
    });
  }

  private async calculateEarningsBreakdown(deliveries: Delivery[]): Promise<EarningsBreakdown> {
    const baseEarnings = deliveries.length * this.BASE_RATE;
    const distanceBonus = deliveries.reduce((sum, d) => sum + (d.distance * this.DISTANCE_RATE), 0);
    const timeBonus = deliveries.reduce((sum, d) => sum + (d.duration * this.TIME_RATE), 0);
    const performanceBonus = this.calculatePerformanceBonus(deliveries);
    const penalties = this.calculatePenalties(deliveries);
    const totalEarnings = baseEarnings + distanceBonus + timeBonus + performanceBonus - penalties;

    return {
      baseEarnings,
      distanceBonus,
      timeBonus,
      performanceBonus,
      penalties,
      totalEarnings
    };
  }

  private calculatePerformanceBonus(deliveries: Delivery[]): number {
    const ratedDeliveries = deliveries.filter(d => d.rating);
    if (ratedDeliveries.length === 0) return 0;

    const averageRating = ratedDeliveries.reduce((sum, d) => sum + (d.rating || 0), 0) / ratedDeliveries.length;
    if (averageRating >= 4.5) return deliveries.length * 500; // High performance bonus
    if (averageRating >= 4.0) return deliveries.length * 250; // Medium performance bonus
    return 0;
  }

  private calculatePenalties(deliveries: Delivery[]): number {
    // Simulate penalties for late deliveries, customer complaints, etc.
    return Math.floor(deliveries.length * 0.1) * 200; // 10% chance of penalty per delivery
  }

  private calculateBonusCommission(delivery: Delivery): number {
    let bonus = 0;
    if (delivery.distance > 10) bonus += 500; // Long distance bonus
    if (delivery.rating && delivery.rating >= 5) bonus += 300; // Perfect rating bonus
    return bonus;
  }

  private async getDeliveriesForPeriod(courierId: string, period: string): Promise<Delivery[]> {
    // Simulate delivery data
    const count = Math.floor(Math.random() * 20) + 5; // 5-25 deliveries
    return Array.from({ length: count }, (_, i) => ({
      deliveryId: `del_${i + 1}`,
      orderId: `ord_${i + 1}`,
      value: Math.floor(Math.random() * 50000) + 10000, // 10k-60k TZS
      distance: Math.floor(Math.random() * 20) + 2, // 2-22 km
      duration: Math.floor(Math.random() * 60) + 15, // 15-75 minutes
      completedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      rating: Math.random() > 0.3 ? Math.floor(Math.random() * 2) + 4 : undefined // 4-5 stars, 30% no rating
    }));
  }

  private async getMonthlyEarningsHistory(courierId: string): Promise<MonthlyEarnings[]> {
    // Simulate 6 months of earnings history
    return Array.from({ length: 6 }, (_, i) => {
      const month = new Date().getMonth() - i;
      const year = new Date().getFullYear();
      const totalEarnings = Math.floor(Math.random() * 200000) + 150000; // 150k-350k TZS

      return {
        month: month < 0 ? month + 12 : month,
        year: month < 0 ? year - 1 : year,
        totalEarnings,
        weeklyBreakdown: [], // Simplified for now
        averageWeekly: totalEarnings / 4,
        growthRate: Math.floor(Math.random() * 20) - 10 // -10% to +10%
      };
    });
  }

  private calculateGrowthTrend(monthlyHistory: MonthlyEarnings[]): 'increasing' | 'stable' | 'decreasing' {
    if (monthlyHistory.length < 2) return 'stable';
    
    const recent = monthlyHistory.slice(0, 3);
    const older = monthlyHistory.slice(3, 6);
    
    const recentAvg = recent.reduce((sum, m) => sum + m.totalEarnings, 0) / recent.length;
    const olderAvg = older.reduce((sum, m) => sum + m.totalEarnings, 0) / older.length;
    
    const change = (recentAvg - olderAvg) / olderAvg;
    
    if (change > 0.05) return 'increasing';
    if (change < -0.05) return 'decreasing';
    return 'stable';
  }

  private getNextPayoutDate(): Date {
    const now = new Date();
    const nextFriday = new Date(now);
    nextFriday.setDate(now.getDate() + (5 - now.getDay() + 7) % 7);
    return nextFriday;
  }
}

export class PayoutProcessor {
  async validatePayoutRequest(request: PayoutRequest): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!request.courierId) errors.push('Courier ID required');
    if (!request.amount || request.amount <= 0) errors.push('Valid amount required');
    if (request.amount < 5000) warnings.push('Minimum payout amount is 5,000 TZS');
    if (!request.method) errors.push('Payment method required');

    return { valid: errors.length === 0, errors, warnings };
  }

  async processPayment(payout: Payout): Promise<PaymentResult> {
    // Simulate payment processing
    const success = Math.random() > 0.1; // 90% success rate
    
    return {
      success,
      transactionId: success ? `txn_${Date.now()}` : undefined,
      message: success ? 'Payment processed successfully' : 'Payment processing failed',
      processedAt: new Date()
    };
  }

  async trackPayoutStatus(payoutId: string): Promise<PayoutStatus> {
    return {
      payoutId,
      status: 'processing',
      progress: 75,
      estimatedCompletion: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
      lastUpdate: new Date()
    };
  }

  async handlePayoutFailures(payout: Payout): Promise<FailureHandling> {
    return {
      retryAttempted: true,
      retryCount: 1,
      nextRetryAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      escalated: false,
      resolution: 'Automatic retry scheduled'
    };
  }
}