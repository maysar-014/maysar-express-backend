import { Request, Response } from 'express';
import { DependencyContainer } from '../../infrastructure/container';
import { EarningsRepositoryPort } from '../../domain/engines/ports/earnings.port';
import { DeliveryRepositoryPort } from '../../domain/engines/ports/delivery.port';

export class EarningsController {
  constructor(
    private earningsRepository: EarningsRepositoryPort = DependencyContainer.getInstance().getEarningsRepository(),
    private deliveryRepository: DeliveryRepositoryPort = DependencyContainer.getInstance().getDeliveryRepository()
  ) {}

  async getEarnings(req: Request, res: Response): Promise<void> {
    try {
      const { period = 'month', startDate, endDate, courierId } = req.query;

      const timeRange = startDate && endDate ? {
        start: new Date(startDate as string),
        end: new Date(endDate as string)
      } : undefined;

      // Get earnings data
      let earnings: any[] = [];
      if (courierId) {
        earnings = await this.earningsRepository.findByCourierId(courierId as string, timeRange);
      } else {
        // For platform-wide summary, we'd need to aggregate all earnings
        // For now, return mock data until we implement platform-wide queries
        earnings = [];
      }

      // Calculate summary
      const totalEarnings = earnings.reduce((sum, earning) => sum + earning.totalEarnings, 0);
      const totalCommissions = earnings.reduce((sum, earning) => sum + earning.commission, 0);
      const netEarnings = earnings.reduce((sum, earning) => sum + earning.netEarnings, 0);
      const pendingPayments = earnings
        .filter(e => e.paymentStatus === 'pending')
        .reduce((sum, earning) => sum + earning.netEarnings, 0);

      res.json({
        success: true,
        data: {
          summary: {
            totalEarnings,
            totalCommissions,
            netEarnings,
            pendingPayments
          },
          breakdown: {
            deliveryFees: earnings.reduce((sum, e) => sum + e.baseFare + e.distanceFee, 0),
            bonuses: earnings.reduce((sum, e) => sum + (e as any).bonuses || 0, 0),
            tips: 0, // Not implemented yet
            deductions: 0 // Not implemented yet
          },
          period: {
            startDate: timeRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            endDate: timeRange?.end || new Date(),
            totalDays: timeRange ?
              Math.ceil((timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60 * 24)) :
              30
          }
        }
      });
    } catch (error: any) {
      console.error('Error getting earnings summary:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve earnings summary'
      });
    }
  }

  async getCourierEarnings(req: Request, res: Response): Promise<void> {
    try {
      const { courierId } = req.params;
      const { period = 'today', startDate, endDate } = req.query;

      const timeRange = startDate && endDate ? {
        start: new Date(startDate as string),
        end: new Date(endDate as string)
      } : undefined;

      const earnings = await this.earningsRepository.findByCourierId(courierId, timeRange);

      // Calculate totals
      const totalEarnings = earnings.reduce((sum, earning) => sum + earning.totalEarnings, 0);
      const totalDeliveries = earnings.length;
      const averagePerDelivery = totalDeliveries > 0 ? totalEarnings / totalDeliveries : 0;

      // Calculate today earnings if period is 'today'
      let todayEarnings = undefined;
      if (period === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayEarningsList = earnings.filter(e =>
          e.createdAt >= today
        );
        todayEarnings = todayEarningsList.reduce((sum, e) => sum + e.totalEarnings, 0);
      }

      res.json({
        success: true,
        data: {
          courierId,
          period,
          todayEarnings,
          totalEarnings,
          deliveriesCount: totalDeliveries,
          averagePerDelivery,
          lastUpdated: new Date()
        }
      });
    } catch (error: any) {
      console.error('Error getting courier earnings:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve courier earnings'
      });
    }
  }

  async recordEarnings(req: Request, res: Response): Promise<void> {
    try {
      const {
        courierId,
        deliveryId,
        baseFare,
        distanceFee,
        weightFee,
        priorityFee,
        bonuses,
        deductions,
        currency
      } = req.body;

      // Calculate totals
      const totalEarnings = (baseFare || 0) + (distanceFee || 0) + (weightFee || 0) + (priorityFee || 0) + (bonuses || 0);
      const commission = totalEarnings * 0.1; // 10% commission
      const netEarnings = totalEarnings - commission - (deductions || 0);

      const earningsData = {
        id: `earn_${Date.now()}`,
        courierId,
        deliveryId,
        baseFare: baseFare || 0,
        distanceFee: distanceFee || 0,
        weightFee: weightFee || 0,
        priorityFee: priorityFee || 0,
        totalEarnings,
        commission,
        netEarnings,
        paymentStatus: 'pending' as 'pending' | 'paid' | 'failed',
        createdAt: new Date(),
        updatedAt: new Date(),
        bonuses: bonuses || 0,
        deductions: deductions || 0,
        currency: currency || 'TZS'
      };

      await this.earningsRepository.save(earningsData);

      res.json({
        success: true,
        data: {
          earningId: earningsData.id,
          courierId,
          deliveryId,
          amount: totalEarnings,
          type: 'delivery_fee',
          status: 'recorded',
          recordedAt: earningsData.createdAt
        }
      });
    } catch (error: any) {
      console.error('Error recording earnings:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to record earnings'
      });
    }
  }

  async calculateCommissions(req: Request, res: Response): Promise<void> {
    try {
      const { deliveries, commissionRate = 0.1 } = req.body;

      if (!deliveries || !Array.isArray(deliveries)) {
        res.status(400).json({
          success: false,
          error: 'Deliveries array is required'
        });
        return;
      }

      const results = deliveries.map((delivery: any) => {
        const amount = delivery.amount || 0;
        const commission = amount * commissionRate;
        return {
          deliveryId: delivery.deliveryId,
          amount,
          commission
        };
      });

      const totalEarnings = results.reduce((sum, r) => sum + r.amount, 0);
      const totalCommission = results.reduce((sum, r) => sum + r.commission, 0);

      res.json({
        success: true,
        data: {
          earnings: totalEarnings,
          commission: totalCommission,
          total: totalEarnings + totalCommission,
          breakdown: results
        }
      });
    } catch (error: any) {
      console.error('Error calculating commissions:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to calculate commissions'
      });
    }
  }

  async getEarningsSummary(req: Request, res: Response): Promise<void> {
    try {
      const { period = 'month', startDate, endDate, courierId } = req.query;

      const timeRange = startDate && endDate ? {
        start: new Date(startDate as string),
        end: new Date(endDate as string)
      } : {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date()
      };

      // Get platform earnings summary
      const platformSummary = await this.earningsRepository.getPlatformEarningsSummary(timeRange);

      let topPerformers: { courierId: string; name: string; earnings: number }[] = [];
      // TODO: Implement proper top performers query from database
      // For now, return empty array until implementation is complete

      res.json({
        success: true,
        data: {
          period,
          totalEarnings: platformSummary.totalRevenue,
          totalDeliveries: platformSummary.deliveryCount,
          averagePerDelivery: platformSummary.deliveryCount > 0 ?
            platformSummary.totalRevenue / platformSummary.deliveryCount : 0,
          topPerformers
        }
      });
    } catch (error: any) {
      console.error('Error getting earnings summary:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve earnings summary'
      });
    }
  }
}
