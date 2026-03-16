import { IDeliveryRepository, Delivery } from '../../domain/repositories';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';

export class DeliveryRepository implements IDeliveryRepository {
  constructor(private databaseClient: any) { }

  async save(delivery: Delivery): Promise<void> {
    try {
      console.log('🔍 DEBUG - Saving delivery to database:', delivery.id);
      console.log('🔍 DEBUG - Database client available:', !!this.databaseClient);

      const deliveryData = {
        id: delivery.id,
        order_id: delivery.orderId,
        courier_id: delivery.courierId,
        status: delivery.status,
        pickup_lat: delivery.pickupLocation.getCoordinates().lat,
        pickup_lng: delivery.pickupLocation.getCoordinates().lng,
        pickup_address: delivery.pickupLocation.getAddress(),
        delivery_lat: delivery.deliveryLocation.getCoordinates().lat,
        delivery_lng: delivery.deliveryLocation.getCoordinates().lng,
        delivery_address: delivery.deliveryLocation.getAddress(),
        estimated_pickup_time: delivery.estimatedPickupTime.toISOString(),
        actual_pickup_time: delivery.actualPickupTime?.toISOString(),
        estimated_delivery_time: delivery.estimatedDeliveryTime.toISOString(),
        actual_delivery_time: delivery.actualDeliveryTime?.toISOString(),
        weight: delivery.weight,
        priority: delivery.priority,
        special_requirements: delivery.specialRequirements || [],
        route_distance: delivery.routeDistance,
        route_duration: Math.round(delivery.routeDuration),
        total_cost: delivery.totalCost,
        buyer_id: delivery.buyerId,
        seller_id: delivery.sellerId,
        cod_commitment_hold_id: delivery.codCommitmentHoldId,
        created_at: delivery.createdAt.toISOString(),
        updated_at: delivery.updatedAt.toISOString()
      };

      console.log('🔍 DEBUG - Delivery data to save:', JSON.stringify(deliveryData, null, 2));

      const { data, error } = await this.databaseClient
        .from('deliveries')
        .upsert(deliveryData, { onConflict: 'id' });

      console.log('🔍 DEBUG - Database upsert result - data:', data, 'error:', error);

      if (error) {
        console.error('❌ Database upsert error:', error);
        throw new Error(`Failed to save delivery to database: ${error.message}`);
      }

      console.log('✅ Delivery saved successfully:', delivery.id);

    } catch (error) {
      console.error('❌ Error saving delivery:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to save delivery: ${errorMessage}`);
    }
  }

  async findById(id: string): Promise<Delivery | null> {
    try {
      const { data: delivery, error } = await this.databaseClient
        .from('deliveries')
        .select(`
          id,
          order_id,
          courier_id,
          status,
          pickup_lat,
          pickup_lng,
          pickup_address,
          delivery_lat,
          delivery_lng,
          delivery_address,
          estimated_pickup_time,
          actual_pickup_time,
          estimated_delivery_time,
          actual_delivery_time,
          weight,
          priority,
          special_requirements,
          route_distance,
          route_duration,
          total_cost,
          created_at,
          updated_at,
          is_cod,
          cod_amount,
          cod_currency,
          cod_collected,
          cod_collected_at,
          cod_otp_verified,
          otp,
          otp_expires_at,
          cod_proof_gps_lat,
          cod_proof_gps_lng,
          cod_proof_timestamp,
          buyer_id,
          seller_id,
          cod_commitment_hold_id
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Database query error:', error);
        return null;
      }

      if (!delivery) {
        return null;
      }

      // Map to domain entity
      return {
        id: delivery.id,
        orderId: delivery.order_id,
        courierId: delivery.courier_id,
        status: delivery.status,
        pickupLocation: GeoPoint.create(
          delivery.pickup_lat,
          delivery.pickup_lng,
          delivery.pickup_address || 'Unknown'
        ),
        deliveryLocation: GeoPoint.create(
          delivery.delivery_lat,
          delivery.delivery_lng,
          delivery.delivery_address || 'Unknown'
        ),
        estimatedPickupTime: new Date(delivery.estimated_pickup_time),
        actualPickupTime: delivery.actual_pickup_time ? new Date(delivery.actual_pickup_time) : undefined,
        estimatedDeliveryTime: new Date(delivery.estimated_delivery_time),
        actualDeliveryTime: delivery.actual_delivery_time ? new Date(delivery.actual_delivery_time) : undefined,
        weight: delivery.weight,
        priority: delivery.priority,
        specialRequirements: delivery.special_requirements || [],
        routeDistance: delivery.route_distance,
        routeDuration: delivery.route_duration,
        totalCost: delivery.total_cost,
        createdAt: new Date(delivery.created_at),
        updatedAt: new Date(delivery.updated_at),
        isCOD: !!delivery.is_cod,
        codAmount: delivery.cod_amount ? Number(delivery.cod_amount) : undefined,
        codCurrency: delivery.cod_currency,
        codCollected: !!delivery.cod_collected,
        codCollectedAt: delivery.cod_collected_at ? new Date(delivery.cod_collected_at) : undefined,
        codOtpVerified: !!delivery.cod_otp_verified,
        otp: delivery.otp,
        otpExpiresAt: delivery.otp_expires_at ? new Date(delivery.otp_expires_at) : undefined,
        codProofGpsLat: delivery.cod_proof_gps_lat,
        codProofGpsLng: delivery.cod_proof_gps_lng,
        codProofTimestamp: delivery.cod_proof_timestamp ? new Date(delivery.cod_proof_timestamp) : undefined,
        buyerId: delivery.buyer_id,
        sellerId: delivery.seller_id,
        codCommitmentHoldId: delivery.cod_commitment_hold_id
      };

    } catch (error) {
      console.error('Error finding delivery by ID:', error);
      return null;
    }
  }

  async findByCourierId(courierId: string): Promise<Delivery[]> {
    try {
      const { data: deliveries, error } = await this.databaseClient
        .from('deliveries')
        .select(`
          id,
          order_id,
          courier_id,
          status,
          pickup_lat,
          pickup_lng,
          pickup_address,
          delivery_lat,
          delivery_lng,
          delivery_address,
          estimated_pickup_time,
          actual_pickup_time,
          estimated_delivery_time,
          actual_delivery_time,
          weight,
          priority,
          special_requirements,
          route_distance,
          route_duration,
          total_cost,
          created_at,
          updated_at,
          is_cod,
          cod_amount,
          cod_currency,
          cod_collected,
          cod_collected_at,
          cod_otp_verified,
          otp,
          otp_expires_at,
          cod_proof_gps_lat,
          cod_proof_gps_lng,
          cod_proof_timestamp,
          buyer_id,
          seller_id,
          cod_commitment_hold_id
        `)
        .eq('courier_id', courierId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database query error:', error);
        return [];
      }

      if (!deliveries || deliveries.length === 0) {
        return [];
      }

      // Map to domain entities
      return deliveries.map((delivery: any) => ({
        id: delivery.id,
        orderId: delivery.order_id,
        courierId: delivery.courier_id,
        status: delivery.status,
        pickupLocation: GeoPoint.create(
          delivery.pickup_lat,
          delivery.pickup_lng,
          delivery.pickup_address || 'Unknown'
        ),
        deliveryLocation: GeoPoint.create(
          delivery.delivery_lat,
          delivery.delivery_lng,
          delivery.delivery_address || 'Unknown'
        ),
        estimatedPickupTime: new Date(delivery.estimated_pickup_time),
        actualPickupTime: delivery.actual_pickup_time ? new Date(delivery.actual_pickup_time) : undefined,
        estimatedDeliveryTime: new Date(delivery.estimated_delivery_time),
        actualDeliveryTime: delivery.actual_delivery_time ? new Date(delivery.actual_delivery_time) : undefined,
        weight: delivery.weight,
        priority: delivery.priority,
        specialRequirements: delivery.special_requirements || [],
        routeDistance: delivery.route_distance,
        routeDuration: delivery.route_duration,
        totalCost: delivery.total_cost,
        createdAt: new Date(delivery.created_at),
        updatedAt: new Date(delivery.updated_at),
        isCOD: !!delivery.is_cod,
        codAmount: delivery.cod_amount ? Number(delivery.cod_amount) : undefined,
        codCurrency: delivery.cod_currency,
        codCollected: !!delivery.cod_collected,
        codCollectedAt: delivery.cod_collected_at ? new Date(delivery.cod_collected_at) : undefined,
        codOtpVerified: !!delivery.cod_otp_verified,
        otp: delivery.otp,
        otpExpiresAt: delivery.otp_expires_at ? new Date(delivery.otp_expires_at) : undefined,
        codProofGpsLat: delivery.cod_proof_gps_lat,
        codProofGpsLng: delivery.cod_proof_gps_lng,
        codProofTimestamp: delivery.cod_proof_timestamp ? new Date(delivery.cod_proof_timestamp) : undefined,
        buyerId: delivery.buyer_id,
        sellerId: delivery.seller_id,
        codCommitmentHoldId: delivery.cod_commitment_hold_id
      }));

    } catch (error) {
      console.error('Error finding deliveries by courier ID:', error);
      return [];
    }
  }

  async findByStatus(status: string): Promise<Delivery[]> {
    try {
      const { data: deliveries, error } = await this.databaseClient
        .from('deliveries')
        .select(`
          id,
          order_id,
          courier_id,
          status,
          pickup_lat,
          pickup_lng,
          pickup_address,
          delivery_lat,
          delivery_lng,
          delivery_address,
          estimated_pickup_time,
          actual_pickup_time,
          estimated_delivery_time,
          actual_delivery_time,
          weight,
          priority,
          special_requirements,
          route_distance,
          route_duration,
          total_cost,
          created_at,
          updated_at,
          is_cod,
          cod_amount,
          cod_currency,
          cod_collected,
          cod_collected_at,
          cod_otp_verified,
          otp,
          otp_expires_at,
          cod_proof_gps_lat,
          cod_proof_gps_lng,
          cod_proof_timestamp,
          buyer_id,
          seller_id,
          cod_commitment_hold_id
        `)
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database query error:', error);
        return [];
      }

      if (!deliveries || deliveries.length === 0) {
        return [];
      }

      // Map to domain entities
      return deliveries.map((delivery: any) => ({
        id: delivery.id,
        orderId: delivery.order_id,
        courierId: delivery.courier_id,
        status: delivery.status,
        pickupLocation: GeoPoint.create(
          delivery.pickup_lat,
          delivery.pickup_lng,
          delivery.pickup_address || 'Unknown'
        ),
        deliveryLocation: GeoPoint.create(
          delivery.delivery_lat,
          delivery.delivery_lng,
          delivery.delivery_address || 'Unknown'
        ),
        estimatedPickupTime: new Date(delivery.estimated_pickup_time),
        actualPickupTime: delivery.actual_pickup_time ? new Date(delivery.actual_pickup_time) : undefined,
        estimatedDeliveryTime: new Date(delivery.estimated_delivery_time),
        actualDeliveryTime: delivery.actual_delivery_time ? new Date(delivery.actual_delivery_time) : undefined,
        weight: delivery.weight,
        priority: delivery.priority,
        specialRequirements: delivery.special_requirements || [],
        routeDistance: delivery.route_distance,
        routeDuration: delivery.route_duration,
        totalCost: delivery.total_cost,
        createdAt: new Date(delivery.created_at),
        updatedAt: new Date(delivery.updated_at),
        isCOD: !!delivery.is_cod,
        codAmount: delivery.cod_amount ? Number(delivery.cod_amount) : undefined,
        codCurrency: delivery.cod_currency,
        codCollected: !!delivery.cod_collected,
        codCollectedAt: delivery.cod_collected_at ? new Date(delivery.cod_collected_at) : undefined,
        codOtpVerified: !!delivery.cod_otp_verified,
        otp: delivery.otp,
        otpExpiresAt: delivery.otp_expires_at ? new Date(delivery.otp_expires_at) : undefined,
        codProofGpsLat: delivery.cod_proof_gps_lat,
        codProofGpsLng: delivery.cod_proof_gps_lng,
        codProofTimestamp: delivery.cod_proof_timestamp ? new Date(delivery.cod_proof_timestamp) : undefined,
        buyerId: delivery.buyer_id,
        sellerId: delivery.seller_id,
        codCommitmentHoldId: delivery.cod_commitment_hold_id
      }));

    } catch (error) {
      console.error('Error finding deliveries by status:', error);
      return [];
    }
  }

  async findAll(timeRange?: { start: Date; end: Date }): Promise<Delivery[]> {
    try {
      let query = this.databaseClient
        .from('deliveries')
        .select(`
          id,
          order_id,
          courier_id,
          status,
          pickup_lat,
          pickup_lng,
          pickup_address,
          delivery_lat,
          delivery_lng,
          delivery_address,
          estimated_pickup_time,
          actual_pickup_time,
          estimated_delivery_time,
          actual_delivery_time,
          weight,
          priority,
          special_requirements,
          route_distance,
          route_duration,
          total_cost,
          created_at,
          updated_at,
          is_cod,
          cod_amount,
          cod_currency,
          cod_collected,
          cod_collected_at,
          cod_otp_verified,
          otp,
          otp_expires_at,
          cod_proof_gps_lat,
          cod_proof_gps_lng,
          cod_proof_timestamp,
          buyer_id,
          seller_id,
          cod_commitment_hold_id
        `)
        .order('created_at', { ascending: false });

      // Apply time range filter if provided
      if (timeRange) {
        query = query
          .gte('created_at', timeRange.start.toISOString())
          .lte('created_at', timeRange.end.toISOString());
      }

      const { data: deliveries, error } = await query;

      if (error) {
        console.error('Database query error:', error);
        return [];
      }

      if (!deliveries || deliveries.length === 0) {
        return [];
      }

      // Map to domain entities
      return deliveries.map((delivery: any) => ({
        id: delivery.id,
        orderId: delivery.order_id,
        courierId: delivery.courier_id,
        status: delivery.status,
        pickupLocation: GeoPoint.create(
          delivery.pickup_lat,
          delivery.pickup_lng,
          delivery.pickup_address || 'Unknown'
        ),
        deliveryLocation: GeoPoint.create(
          delivery.delivery_lat,
          delivery.delivery_lng,
          delivery.delivery_address || 'Unknown'
        ),
        estimatedPickupTime: new Date(delivery.estimated_pickup_time),
        actualPickupTime: delivery.actual_pickup_time ? new Date(delivery.actual_pickup_time) : undefined,
        estimatedDeliveryTime: new Date(delivery.estimated_delivery_time),
        actualDeliveryTime: delivery.actual_delivery_time ? new Date(delivery.actual_delivery_time) : undefined,
        weight: delivery.weight,
        priority: delivery.priority,
        specialRequirements: delivery.special_requirements || [],
        routeDistance: delivery.route_distance,
        routeDuration: delivery.route_duration,
        totalCost: delivery.total_cost,
        createdAt: new Date(delivery.created_at),
        updatedAt: new Date(delivery.updated_at),
        isCOD: !!delivery.is_cod,
        codAmount: delivery.cod_amount ? Number(delivery.cod_amount) : undefined,
        codCurrency: delivery.cod_currency,
        codCollected: !!delivery.cod_collected,
        codCollectedAt: delivery.cod_collected_at ? new Date(delivery.cod_collected_at) : undefined,
        codOtpVerified: !!delivery.cod_otp_verified,
        otp: delivery.otp,
        otpExpiresAt: delivery.otp_expires_at ? new Date(delivery.otp_expires_at) : undefined,
        codProofGpsLat: delivery.cod_proof_gps_lat,
        codProofGpsLng: delivery.cod_proof_gps_lng,
        codProofTimestamp: delivery.cod_proof_timestamp ? new Date(delivery.cod_proof_timestamp) : undefined,
        buyerId: delivery.buyer_id,
        sellerId: delivery.seller_id,
        codCommitmentHoldId: delivery.cod_commitment_hold_id
      }));

    } catch (error) {
      console.error('Error finding all deliveries:', error);
      return [];
    }
  }

  async updateStatus(id: string, status: string, metadata?: any): Promise<void> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      // Update actual times based on status
      if (status === 'picked_up') {
        updateData.actual_pickup_time = new Date().toISOString();
      } else if (status === 'delivered') {
        updateData.actual_delivery_time = new Date().toISOString();
      }

      // Map metadata if present
      if (metadata) {
        if (metadata.otp) updateData.otp = metadata.otp;
        if (metadata.otpExpiresAt) updateData.otp_expires_at = metadata.otpExpiresAt.toISOString();
        if (metadata.codCollected !== undefined) updateData.cod_collected = metadata.codCollected;
        if (metadata.codCollectedAt) updateData.cod_collected_at = metadata.codCollectedAt.toISOString();
        if (metadata.codOtpVerified !== undefined) updateData.cod_otp_verified = metadata.codOtpVerified;
        if (metadata.codProofGpsLat) updateData.cod_proof_gps_lat = metadata.codProofGpsLat;
        if (metadata.codProofGpsLng) updateData.cod_proof_gps_lng = metadata.codProofGpsLng;
        if (metadata.codProofTimestamp) updateData.cod_proof_timestamp = metadata.codProofTimestamp.toISOString();
        if (metadata.isCOD !== undefined) updateData.is_cod = metadata.isCOD;
        if (metadata.buyerId) updateData.buyer_id = metadata.buyerId;
        if (metadata.sellerId) updateData.seller_id = metadata.sellerId;
        if (metadata.codCommitmentHoldId) updateData.cod_commitment_hold_id = metadata.codCommitmentHoldId;
      }

      const { error } = await this.databaseClient
        .from('deliveries')
        .update(updateData)
        .eq('id', id);

      if (error) {
        console.error('Database update error:', error);
        throw new Error('Failed to update delivery status');
      }

    } catch (error) {
      console.error('Error updating delivery status:', error);
      throw new Error('Failed to update delivery status');
    }
  }

  async updateEstimatedDeliveryTime(
    id: string,
    estimatedDeliveryTime: Date,
    routeDistanceKm?: number,
    routeDurationMinutes?: number
  ): Promise<void> {
    try {
      const updateData: any = {
        estimated_delivery_time: estimatedDeliveryTime.toISOString(),
        updated_at: new Date().toISOString()
      };

      if (routeDistanceKm !== undefined) {
        updateData.route_distance = routeDistanceKm;
      }
      if (routeDurationMinutes !== undefined) {
        updateData.route_duration = Math.round(routeDurationMinutes);
      }

      const { error } = await this.databaseClient
        .from('deliveries')
        .update(updateData)
        .eq('id', id);

      if (error) {
        console.error('Database update error:', error);
        throw new Error('Failed to update estimated delivery time');
      }
    } catch (error) {
      console.error('Error updating estimated delivery time:', error);
      throw new Error('Failed to update estimated delivery time');
    }
  }

  async findActiveDeliveries(): Promise<Delivery[]> {
    try {
      const activeStatuses = ['assigned', 'picked_up', 'in_transit'];

      const { data: deliveries, error } = await this.databaseClient
        .from('deliveries')
        .select(`
          id,
          order_id,
          courier_id,
          status,
          pickup_lat,
          pickup_lng,
          pickup_address,
          delivery_lat,
          delivery_lng,
          delivery_address,
          estimated_pickup_time,
          actual_pickup_time,
          estimated_delivery_time,
          actual_delivery_time,
          weight,
          priority,
          special_requirements,
          route_distance,
          route_duration,
          total_cost,
          created_at,
          updated_at,
          is_cod,
          cod_amount,
          cod_currency,
          cod_collected,
          cod_collected_at,
          cod_otp_verified,
          otp,
          otp_expires_at,
          cod_proof_gps_lat,
          cod_proof_gps_lng,
          cod_proof_timestamp,
          buyer_id,
          seller_id,
          cod_commitment_hold_id
        `)
        .in('status', activeStatuses)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database query error:', error);
        return [];
      }

      if (!deliveries || deliveries.length === 0) {
        return [];
      }

      // Map to domain entities
      return deliveries.map((delivery: any) => ({
        id: delivery.id,
        orderId: delivery.order_id,
        courierId: delivery.courier_id,
        status: delivery.status,
        pickupLocation: GeoPoint.create(
          delivery.pickup_lat,
          delivery.pickup_lng,
          delivery.pickup_address || 'Unknown'
        ),
        deliveryLocation: GeoPoint.create(
          delivery.delivery_lat,
          delivery.delivery_lng,
          delivery.delivery_address || 'Unknown'
        ),
        estimatedPickupTime: new Date(delivery.estimated_pickup_time),
        actualPickupTime: delivery.actual_pickup_time ? new Date(delivery.actual_pickup_time) : undefined,
        estimatedDeliveryTime: new Date(delivery.estimated_delivery_time),
        actualDeliveryTime: delivery.actual_delivery_time ? new Date(delivery.actual_delivery_time) : undefined,
        weight: delivery.weight,
        priority: delivery.priority,
        specialRequirements: delivery.special_requirements || [],
        routeDistance: delivery.route_distance,
        routeDuration: delivery.route_duration,
        totalCost: delivery.total_cost,
        createdAt: new Date(delivery.created_at),
        updatedAt: new Date(delivery.updated_at),
        isCOD: !!delivery.is_cod,
        codAmount: delivery.cod_amount ? Number(delivery.cod_amount) : undefined,
        codCurrency: delivery.cod_currency,
        codCollected: !!delivery.cod_collected,
        codCollectedAt: delivery.cod_collected_at ? new Date(delivery.cod_collected_at) : undefined,
        codOtpVerified: !!delivery.cod_otp_verified,
        otp: delivery.otp,
        otpExpiresAt: delivery.otp_expires_at ? new Date(delivery.otp_expires_at) : undefined,
        codProofGpsLat: delivery.cod_proof_gps_lat,
        codProofGpsLng: delivery.cod_proof_gps_lng,
        codProofTimestamp: delivery.cod_proof_timestamp ? new Date(delivery.cod_proof_timestamp) : undefined,
        buyerId: delivery.buyer_id,
        sellerId: delivery.seller_id,
        codCommitmentHoldId: delivery.cod_commitment_hold_id
      }));

    } catch (error) {
      console.error('Error finding active deliveries:', error);
      return [];
    }
  }

  async getDeliveryStats(timeRange?: { start: Date; end: Date }): Promise<{
    totalDeliveries: number;
    completedDeliveries: number;
    averageDeliveryTime: number;
    onTimeDeliveryRate: number;
  }> {
    try {
      let query = this.databaseClient.from('deliveries').select('status, actual_delivery_time, estimated_delivery_time');

      // Apply time range filter if provided
      if (timeRange) {
        query = query
          .gte('created_at', timeRange.start.toISOString())
          .lte('created_at', timeRange.end.toISOString());
      }

      const { data: deliveries, error } = await query;

      if (error) {
        console.error('Database query error:', error);
        return {
          totalDeliveries: 0,
          completedDeliveries: 0,
          averageDeliveryTime: 0,
          onTimeDeliveryRate: 0
        };
      }

      if (!deliveries || deliveries.length === 0) {
        return {
          totalDeliveries: 0,
          completedDeliveries: 0,
          averageDeliveryTime: 0,
          onTimeDeliveryRate: 0
        };
      }

      const totalDeliveries = deliveries.length;
      const completedDeliveries = deliveries.filter((d: any) => d.status === 'delivered').length;

      // Calculate average delivery time for completed deliveries
      const completedDeliveriesWithTimes = deliveries.filter((d: any) =>
        d.status === 'delivered' && d.actual_delivery_time && d.estimated_delivery_time
      );

      let averageDeliveryTime = 0;
      if (completedDeliveriesWithTimes.length > 0) {
        const totalTime = completedDeliveriesWithTimes.reduce((sum: number, delivery: any) => {
          const actual = new Date(delivery.actual_delivery_time);
          const estimated = new Date(delivery.estimated_delivery_time);
          return sum + (actual.getTime() - estimated.getTime()) / (1000 * 60); // minutes
        }, 0);
        averageDeliveryTime = totalTime / completedDeliveriesWithTimes.length;
      }

      // Calculate on-time delivery rate
      const onTimeDeliveries = completedDeliveriesWithTimes.filter((delivery: any) => {
        const actual = new Date(delivery.actual_delivery_time);
        const estimated = new Date(delivery.estimated_delivery_time);
        return actual <= estimated;
      }).length;

      const onTimeDeliveryRate = completedDeliveriesWithTimes.length > 0 ?
        onTimeDeliveries / completedDeliveriesWithTimes.length : 0;

      return {
        totalDeliveries,
        completedDeliveries,
        averageDeliveryTime: Math.round(averageDeliveryTime),
        onTimeDeliveryRate: Math.round(onTimeDeliveryRate * 100) / 100
      };

    } catch (error) {
      console.error('Error getting delivery stats:', error);
      return {
        totalDeliveries: 0,
        completedDeliveries: 0,
        averageDeliveryTime: 0,
        onTimeDeliveryRate: 0
      };
    }
  }
}

