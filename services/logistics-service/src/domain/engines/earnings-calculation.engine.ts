export interface EarningsBreakdown {
  baseEarnings: number;
  distanceBonus: number;
  timeBonus: number;
  performanceBonus: number;
  penalties: number;
  totalEarnings: number;
  deliveryCount: number;
  hoursWorked: number;
}

export interface Commission {
  deliveryId: string;
  baseCommission: number;
  bonusCommission: number;
  totalCommission: number;
  commissionRate: number;
}

export interface PayoutRequest {
  courierId: string;
  amount: number;
  method: 'mobile_money' | 'bank_transfer' | 'cash';
  accountDetails: Record<string, any>;
}

export interface PayoutResult {
  payoutId: string;
  status: 'processing' | 'completed' | 'failed';
  amount: number;
  estimatedCompletion?: Date;
  transactionId?: string;
  errorMessage?: string;
}

export class EarningsCalculationEngine {
  private readonly BASE_RATE = 2000; // TZS per delivery
  private readonly DISTANCE_RATE = 500; // TZS per km
  private readonly TIME_RATE = 200; // TZS per minute
  private readonly PERFORMANCE_MULTIPLIER = 0.1; // 10% bonus for high performance

  async calculateDailyEarnings(courierId: string, date: Date): Promise<EarningsBreakdown> {
    try {
      // Simulate delivery data retrieval
      const deliveries = await this.getDeliveriesForDate(courierId, date);
      const performanceScore = await this.getPerformanceScore(courierId);
      
      let baseEarnings = 0;
      let distanceBonus = 0;
      let timeBonus = 0;
      let totalDistance = 0;
      let totalTime = 0;

      for (const delivery of deliveries) {
        baseEarnings += this.BASE_RATE;
        distanceBonus += delivery.distance * this.DISTANCE_RATE;
        timeBonus += delivery.duration * this.TIME_RATE;
        totalDistance += delivery.distance;
        totalTime += delivery.duration;
      }

      const performanceBonus = performanceScore > 90 ? 
        (baseEarnings + distanceBonus + timeBonus) * this.PERFORMANCE_MULTIPLIER : 0;

      const penalties = await this.calculatePenalties(courierId, date);
      const totalEarnings = baseEarnings + distanceBonus + timeBonus + performanceBonus - penalties;

      return {
        baseEarnings,
        distanceBonus,
        timeBonus,
        performanceBonus,
        penalties,
        totalEarnings,
        deliveryCount: deliveries.length,
        hoursWorked: totalTime / 60
      };
    } catch (error) {
      throw new Error(`Failed to calculate daily earnings: ${error}`);
    }
  }

  async calculateCommissions(deliveries: any[]): Promise<Commission[]> {
    return deliveries.map(delivery => {
      const baseCommission = delivery.value * 0.05; // 5% base commission
      const bonusCommission = delivery.priority === 'urgent' ? baseCommission * 0.2 : 0;
      
      return {
        deliveryId: delivery.id,
        baseCommission,
        bonusCommission,
        totalCommission: baseCommission + bonusCommission,
        commissionRate: 5.0
      };
    });
  }

  async processPayoutRequest(courierId: string, amount: number): Promise<PayoutResult> {
    const payoutId = `payout_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    try {
      // Validate payout eligibility
      const pendingEarnings = await this.getPendingEarnings(courierId);
      if (amount > pendingEarnings) {
        return {
          payoutId,
          status: 'failed',
          amount,
          errorMessage: 'Insufficient pending earnings'
        };
      }

      // Simulate payout processing
      const estimatedCompletion = new Date();
      estimatedCompletion.setHours(estimatedCompletion.getHours() + 2);

      return {
        payoutId,
        status: 'processing',
        amount,
        estimatedCompletion,
        transactionId: `txn_${Date.now()}`
      };
    } catch (error) {
      return {
        payoutId,
        status: 'failed',
        amount,
        errorMessage: `Payout processing failed: ${error}`
      };
    }
  }

  async getTodayEarnings(courierId: string): Promise<any> {
    const today = new Date();
    const earnings = await this.calculateDailyEarnings(courierId, today);
    
    return {
      total: earnings.totalEarnings,
      breakdown: {
        base: earnings.baseEarnings,
        distance: earnings.distanceBonus,
        time: earnings.timeBonus,
        performanceBonus: earnings.performanceBonus,
        penalties: earnings.penalties
      },
      deliveryCount: earnings.deliveryCount,
      hoursWorked: earnings.hoursWorked
    };
  }

  async getPendingEarnings(courierId: string): Promise<number> {
    // Simulate pending earnings calculation
    const last7Days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const earnings = await this.calculateDailyEarnings(courierId, date);
      last7Days.push(earnings.totalEarnings);
    }
    
    return last7Days.reduce((sum, earnings) => sum + earnings, 0);
  }

  async getPayoutHistory(courierId: string): Promise<any[]> {
    // Simulate payout history
    return [
      {
        period: 'Dec 29, 2025',
        amount: 156750,
        status: 'Completed',
        payoutMethod: 'Mobile Money',
        transactionId: 'TXN-123456',
        breakdown: {
          base: 112000,
          distance: 29800,
          time: 12950,
          bonuses: 2000
        }
      },
      {
        period: 'Dec 22, 2025',
        amount: 142300,
        status: 'Completed',
        payoutMethod: 'Mobile Money',
        transactionId: 'TXN-123455',
        breakdown: {
          base: 98000,
          distance: 28500,
          time: 13800,
          bonuses: 2000
        }
      }
    ];
  }

  private async getDeliveriesForDate(courierId: string, date: Date): Promise<any[]> {
    // Simulate delivery data
    return [
      { id: 'del_001', distance: 5.2, duration: 25, value: 25000, priority: 'normal' },
      { id: 'del_002', distance: 3.8, duration: 18, value: 18000, priority: 'urgent' },
      { id: 'del_003', distance: 7.1, duration: 32, value: 35000, priority: 'normal' }
    ];
  }

  private async getPerformanceScore(courierId: string): Promise<number> {
    // Simulate performance score retrieval
    return 94.2;
  }

  private async calculatePenalties(courierId: string, date: Date): Promise<number> {
    // Simulate penalty calculation
    return 0; // No penalties for this example
  }
}