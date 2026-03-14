import { IEarningsRepository, Earnings } from '../../domain/repositories';

export class EarningsRepository implements IEarningsRepository {
  constructor(private databaseClient: any) { }

  async save(earnings: Earnings): Promise<void> {
    try {
      const earningsData = {
        id: earnings.id,
        courier_id: earnings.courierId,
        delivery_id: earnings.deliveryId,
        base_fare: earnings.baseFare,
        distance_fee: earnings.distanceFee,
        weight_fee: earnings.weightFee,
        priority_fee: earnings.priorityFee,
        total_earnings: earnings.totalEarnings,
        commission: earnings.commission,
        net_earnings: earnings.netEarnings,
        payment_status: earnings.paymentStatus,
        payment_date: earnings.paymentDate?.toISOString(),
        created_at: earnings.createdAt.toISOString(),
        updated_at: earnings.updatedAt.toISOString()
      };

      const { error } = await this.databaseClient
        .from('earnings')
        .upsert(earningsData, { onConflict: 'id' });

      if (error) {
        console.error('Database upsert error:', error);
        throw new Error('Failed to save earnings to database');
      }

    } catch (error) {
      console.error('Error saving earnings:', error);
      throw new Error('Failed to save earnings');
    }
  }

  async findByCourierId(courierId: string, timeRange?: { start: Date; end: Date }): Promise<Earnings[]> {
    try {
      let query = this.databaseClient
        .from('earnings')
        .select(`
          id,
          courier_id,
          delivery_id,
          base_fare,
          distance_fee,
          weight_fee,
          priority_fee,
          total_earnings,
          commission,
          net_earnings,
          payment_status,
          payment_date,
          created_at,
          updated_at
        `)
        .eq('courier_id', courierId);

      // Apply time range filter if provided
      if (timeRange) {
        query = query
          .gte('created_at', timeRange.start.toISOString())
          .lte('created_at', timeRange.end.toISOString());
      }

      const { data: earnings, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Suphabase query error:', error);
        return [];
      }

      if (!earnings || earnings.length === 0) {
        return [];
      }

      // Map to domain entities
      return earnings.map((earning: any) => ({
        id: earning.id,
        courierId: earning.courier_id,
        deliveryId: earning.delivery_id,
        baseFare: earning.base_fare,
        distanceFee: earning.distance_fee,
        weightFee: earning.weight_fee,
        priorityFee: earning.priority_fee,
        totalEarnings: earning.total_earnings,
        commission: earning.commission,
        netEarnings: earning.net_earnings,
        paymentStatus: earning.payment_status,
        paymentDate: earning.payment_date ? new Date(earning.payment_date) : undefined,
        createdAt: new Date(earning.created_at),
        updatedAt: new Date(earning.updated_at)
      }));

    } catch (error) {
      console.error('Error finding earnings by courier ID:', error);
      return [];
    }
  }

  async findByDeliveryId(deliveryId: string): Promise<Earnings | null> {
    try {
      const { data: earning, error } = await this.databaseClient
        .from('earnings')
        .select(`
          id,
          courier_id,
          delivery_id,
          base_fare,
          distance_fee,
          weight_fee,
          priority_fee,
          total_earnings,
          commission,
          net_earnings,
          payment_status,
          payment_date,
          created_at,
          updated_at
        `)
        .eq('delivery_id', deliveryId)
        .single();

      if (error) {
        console.error('Database query error:', error);
        return null;
      }

      if (!earning) {
        return null;
      }

      // Map to domain entity
      return {
        id: earning.id,
        courierId: earning.courier_id,
        deliveryId: earning.delivery_id,
        baseFare: earning.base_fare,
        distanceFee: earning.distance_fee,
        weightFee: earning.weight_fee,
        priorityFee: earning.priority_fee,
        totalEarnings: earning.total_earnings,
        commission: earning.commission,
        netEarnings: earning.net_earnings,
        paymentStatus: earning.payment_status,
        paymentDate: earning.payment_date ? new Date(earning.payment_date) : undefined,
        createdAt: new Date(earning.created_at),
        updatedAt: new Date(earning.updated_at)
      };

    } catch (error) {
      console.error('Error finding earnings by delivery ID:', error);
      return null;
    }
  }

  async findAllEarnings(timeRange?: { start: Date; end: Date }): Promise<Earnings[]> {
    try {
      let query = this.databaseClient
        .from('earnings')
        .select(`
          id,
          courier_id,
          delivery_id,
          base_fare,
          distance_fee,
          weight_fee,
          priority_fee,
          total_earnings,
          commission,
          net_earnings,
          payment_status,
          payment_date,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });

      // Apply time range filter if provided
      if (timeRange) {
        query = query
          .gte('created_at', timeRange.start.toISOString())
          .lte('created_at', timeRange.end.toISOString());
      }

      const { data: earnings, error } = await query;

      if (error) {
        console.error('Database query error:', error);
        return [];
      }

      if (!earnings || earnings.length === 0) {
        return [];
      }

      // Map to domain entities
      return earnings.map((earning: any) => ({
        id: earning.id,
        courierId: earning.courier_id,
        deliveryId: earning.delivery_id,
        baseFare: earning.base_fare,
        distanceFee: earning.distance_fee,
        weightFee: earning.weight_fee,
        priorityFee: earning.priority_fee,
        totalEarnings: earning.total_earnings,
        commission: earning.commission,
        netEarnings: earning.net_earnings,
        paymentStatus: earning.payment_status,
        paymentDate: earning.payment_date ? new Date(earning.payment_date) : undefined,
        createdAt: new Date(earning.created_at),
        updatedAt: new Date(earning.updated_at)
      }));

    } catch (error) {
      console.error('Error finding all earnings:', error);
      return [];
    }
  }

  async updatePaymentStatus(id: string, status: 'pending' | 'paid' | 'failed', paymentDate?: Date): Promise<void> {
    try {
      const updateData: any = {
        payment_status: status,
        updated_at: new Date().toISOString()
      };

      // Set payment date if status is 'paid'
      if (status === 'paid' && paymentDate) {
        updateData.payment_date = paymentDate.toISOString();
      }

      const { error } = await this.databaseClient
        .from('earnings')
        .update(updateData)
        .eq('id', id);

      if (error) {
        console.error('Database update error:', error);
        throw new Error('Failed to update payment status');
      }

    } catch (error) {
      console.error('Error updating payment status:', error);
      throw new Error('Failed to update payment status');
    }
  }

  async getCourierEarningsSummary(courierId: string, period: { start: Date; end: Date }): Promise<{
    totalEarnings: number;
    totalDeliveries: number;
    averagePerDelivery: number;
    pendingPayments: number;
    paidPayments: number;
  }> {
    try {
      // Get earnings within the period
      const { data: earnings, error } = await this.databaseClient
        .from('earnings')
        .select('total_earnings, net_earnings, payment_status')
        .eq('courier_id', courierId)
        .gte('created_at', period.start.toISOString())
        .lte('created_at', period.end.toISOString());

      if (error) {
        console.error('Database query error:', error);
        return {
          totalEarnings: 0,
          totalDeliveries: 0,
          averagePerDelivery: 0,
          pendingPayments: 0,
          paidPayments: 0
        };
      }

      if (!earnings || earnings.length === 0) {
        return {
          totalEarnings: 0,
          totalDeliveries: 0,
          averagePerDelivery: 0,
          pendingPayments: 0,
          paidPayments: 0
        };
      }

      const totalDeliveries = earnings.length;
      const totalEarnings = earnings.reduce((sum: number, earning: any) => sum + earning.total_earnings, 0);
      const averagePerDelivery = totalEarnings / totalDeliveries;

      // Calculate payment amounts
      const pendingPayments = earnings
        .filter((earning: any) => earning.payment_status === 'pending')
        .reduce((sum: number, earning: any) => sum + earning.net_earnings, 0);

      const paidPayments = earnings
        .filter((earning: any) => earning.payment_status === 'paid')
        .reduce((sum: number, earning: any) => sum + earning.net_earnings, 0);

      return {
        totalEarnings,
        totalDeliveries,
        averagePerDelivery: Math.round(averagePerDelivery),
        pendingPayments,
        paidPayments
      };

    } catch (error) {
      console.error('Error getting courier earnings summary:', error);
      return {
        totalEarnings: 0,
        totalDeliveries: 0,
        averagePerDelivery: 0,
        pendingPayments: 0,
        paidPayments: 0
      };
    }
  }

  async getPlatformEarningsSummary(period: { start: Date; end: Date }): Promise<{
    totalRevenue: number;
    totalCommissions: number;
    totalPayouts: number;
    netProfit: number;
    deliveryCount: number;
  }> {
    try {
      // Aggregate all earnings within the period
      const { data: earnings, error } = await this.databaseClient
        .from('earnings')
        .select('total_earnings, commission, net_earnings, payment_status')
        .gte('created_at', period.start.toISOString())
        .lte('created_at', period.end.toISOString());

      if (error) {
        console.error('Database query error:', error);
        return {
          totalRevenue: 0,
          totalCommissions: 0,
          totalPayouts: 0,
          netProfit: 0,
          deliveryCount: 0
        };
      }

      if (!earnings || earnings.length === 0) {
        return {
          totalRevenue: 0,
          totalCommissions: 0,
          totalPayouts: 0,
          netProfit: 0,
          deliveryCount: 0
        };
      }

      const deliveryCount = earnings.length;
      const totalRevenue = earnings.reduce((sum: number, earning: any) => sum + earning.total_earnings, 0);
      const totalCommissions = earnings.reduce((sum: number, earning: any) => sum + earning.commission, 0);
      const totalPayouts = earnings
        .filter((earning: any) => earning.payment_status === 'paid')
        .reduce((sum: number, earning: any) => sum + earning.net_earnings, 0);

      const netProfit = totalRevenue - totalPayouts;

      return {
        totalRevenue,
        totalCommissions,
        totalPayouts,
        netProfit,
        deliveryCount
      };

    } catch (error) {
      console.error('Error getting platform earnings summary:', error);
      return {
        totalRevenue: 0,
        totalCommissions: 0,
        totalPayouts: 0,
        netProfit: 0,
        deliveryCount: 0
      };
    }
  }
}

