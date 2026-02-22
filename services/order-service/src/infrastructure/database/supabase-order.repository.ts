import { SupabaseClient } from '@supabase/supabase-js';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { Order } from '../../domain/entities/order.entity';
import { OrderStatus } from '../../domain/entities/order.entity';
import { SupabaseClientManager } from './supabase.client';

export class SupabaseOrderRepository implements OrderRepository {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = SupabaseClientManager.getInstance().getClient()!;
  }

  async save(order: Order): Promise<void> {
    try {
      const orderData = {
        id: order.id,
        buyer_id: order.buyerId,
        seller_id: order.sellerId,
        status: order.status as any,
        payment_method: order.paymentMethod as any,
        total_amount: order.totalAmount.amount,
        currency: order.totalAmount.currency,
        total_weight: order.totalWeight,
        cod_commitment_fee: (order as any).codCommitmentFee,
        cod_commitment_paid: (order as any).codCommitmentPaid,
        delivery_address: {
          street: order.deliveryAddress.street,
          city: order.deliveryAddress.city,
          postalCode: order.deliveryAddress.postalCode,
          country: order.deliveryAddress.country
        } as any,
        cod_reputation_score: order.codReputationScore,
        cod_eligibility_checked: order.codEligibilityChecked,
        cod_delivery_otp: order.codDeliveryOtp,
        cod_otp_expires_at: order.codOtpExpiresAt?.toISOString(),
        cod_delivery_confirmed_at: order.codDeliveryConfirmedAt?.toISOString(),
        cod_delivery_confirmed_by: order.codDeliveryConfirmedBy,
        cod_proof_gps_lat: order.codProofGpsLat,
        cod_proof_gps_lng: order.codProofGpsLng,
        cod_proof_timestamp: order.codProofTimestamp?.toISOString(),
        cod_commitment_hold_id: order.codCommitmentHoldId,
        created_at: order.createdAt.toISOString(),
        updated_at: order.updatedAt.toISOString()
      };

      // Insert order
      const { error: orderError } = await this.supabase
        .from('orders')
        .insert(orderData);

      if (orderError) {
        throw new Error(`Failed to save order: ${orderError.message}`);
      }

      // Insert order items
      const orderItems = order.items.map(item => ({
        order_id: order.id,
        product_id: item.productId,
        quantity: item.quantity,
        price: item.price.amount,
        weight: item.weight,
        currency: item.price.currency
      }));

      const { error: itemsError } = await this.supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        throw new Error(`Failed to save order items: ${itemsError.message}`);
      }

    } catch (error) {
      console.error('Error saving order to Supabase:', error);
      throw new Error(`Failed to save order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findById(id: string): Promise<Order | null> {
    try {
      const { data: orderData, error } = await this.supabase
        .from('orders')
        .select(`
          *,
          items:order_items(*)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No rows returned
        }
        throw new Error(`Failed to find order: ${error.message}`);
      }

      if (!orderData) {
        return null;
      }

      return this.mapSupabaseOrderToDomain(orderData);

    } catch (error) {
      console.error('Error finding order by ID:', error);
      throw new Error(`Failed to find order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByBuyerId(buyerId: string): Promise<Order[]> {
    try {
      const { data: ordersData, error } = await this.supabase
        .from('orders')
        .select(`
          *,
          items:order_items(*)
        `)
        .eq('buyer_id', buyerId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to find orders by buyer: ${error.message}`);
      }

      return ordersData.map(order => this.mapSupabaseOrderToDomain(order));

    } catch (error) {
      console.error('Error finding orders by buyer ID:', error);
      throw new Error(`Failed to find orders by buyer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async update(order: Order): Promise<void> {
    try {
      const orderData = {
        buyer_id: order.buyerId,
        seller_id: order.sellerId,
        status: order.status as any,
        payment_method: order.paymentMethod as any,
        total_amount: order.totalAmount.amount,
        currency: order.totalAmount.currency,
        total_weight: order.totalWeight,
        delivery_address: {
          street: order.deliveryAddress.street,
          city: order.deliveryAddress.city,
          postalCode: order.deliveryAddress.postalCode,
          country: order.deliveryAddress.country
        } as any,
        cod_commitment_fee: order.codCommitmentFee,
        cod_commitment_paid: order.codCommitmentPaid,
        cod_reputation_score: order.codReputationScore,
        cod_eligibility_checked: order.codEligibilityChecked,
        cod_delivery_otp: order.codDeliveryOtp,
        cod_otp_expires_at: order.codOtpExpiresAt?.toISOString(),
        cod_delivery_confirmed_at: order.codDeliveryConfirmedAt?.toISOString(),
        cod_delivery_confirmed_by: order.codDeliveryConfirmedBy,
        cod_proof_gps_lat: order.codProofGpsLat,
        cod_proof_gps_lng: order.codProofGpsLng,
        cod_proof_timestamp: order.codProofTimestamp?.toISOString(),
        cod_commitment_hold_id: order.codCommitmentHoldId,
        updated_at: new Date().toISOString()
      };

      const { error } = await this.supabase
        .from('orders')
        .update(orderData)
        .eq('id', order.id);

      if (error) {
        throw new Error(`Failed to update order: ${error.message}`);
      }

    } catch (error) {
      console.error('Error updating order:', error);
      throw new Error(`Failed to update order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('orders')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to delete order: ${error.message}`);
      }

    } catch (error) {
      console.error('Error deleting order:', error);
      throw new Error(`Failed to delete order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private mapSupabaseOrderToDomain(orderData: any): Order {
    const deliveryAddress = orderData.delivery_address as any;

    const orderDataForDomain = {
      id: orderData.id,
      buyerId: orderData.buyer_id,
      sellerId: orderData.seller_id,
      items: orderData.items.map((item: any) => ({
        productId: item.product_id,
        quantity: item.quantity,
        price: { amount: Number(item.price), currency: item.currency },
        weight: item.weight
      })),
      totalAmount: Number(orderData.total_amount),
      currency: orderData.currency,
      totalWeight: orderData.total_weight,
      paymentMethod: orderData.payment_method as any,
      deliveryAddress: {
        street: deliveryAddress.street,
        city: deliveryAddress.city,
        postalCode: deliveryAddress.postalCode,
        country: deliveryAddress.country
      }
    };

    const order = new Order(orderDataForDomain);
    // Override the status and dates from database
    (order as any).status = orderData.status;
    (order as any).createdAt = new Date(orderData.created_at);
    (order as any).updatedAt = new Date(orderData.updated_at);

    // COD fields override
    order.codCommitmentFee = orderData.cod_commitment_fee ? Number(orderData.cod_commitment_fee) : undefined;
    order.codCommitmentPaid = !!orderData.cod_commitment_paid;
    order.codReputationScore = orderData.cod_reputation_score;
    order.codEligibilityChecked = !!orderData.cod_eligibility_checked;
    order.codDeliveryOtp = orderData.cod_delivery_otp;
    if (orderData.cod_otp_expires_at) order.codOtpExpiresAt = new Date(orderData.cod_otp_expires_at);
    if (orderData.cod_delivery_confirmed_at) order.codDeliveryConfirmedAt = new Date(orderData.cod_delivery_confirmed_at);
    order.codDeliveryConfirmedBy = orderData.cod_delivery_confirmed_by;
    order.codProofGpsLat = orderData.cod_proof_gps_lat;
    order.codProofGpsLng = orderData.cod_proof_gps_lng;
    if (orderData.cod_proof_timestamp) order.codProofTimestamp = new Date(orderData.cod_proof_timestamp);
    order.codCommitmentHoldId = orderData.cod_commitment_hold_id;

    return order;
  }

  // Additional helper methods for robust operations
  async exists(id: string): Promise<boolean> {
    try {
      const { count, error } = await this.supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('id', id);

      if (error) {
        console.error('Error checking order existence:', error);
        return false;
      }

      return (count || 0) > 0;
    } catch (error) {
      console.error('Error checking order existence:', error);
      return false;
    }
  }

  async count(): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });

      if (error) {
        throw new Error(`Failed to count orders: ${error.message}`);
      }

      return count || 0;
    } catch (error) {
      console.error('Error counting orders:', error);
      throw new Error(`Failed to count orders: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByStatus(status: OrderStatus): Promise<Order[]> {
    try {
      const { data: ordersData, error } = await this.supabase
        .from('orders')
        .select(`
          *,
          items:order_items(*)
        `)
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to find orders by status: ${error.message}`);
      }

      return ordersData.map(order => this.mapSupabaseOrderToDomain(order));

    } catch (error) {
      console.error('Error finding orders by status:', error);
      throw new Error(`Failed to find orders by status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
