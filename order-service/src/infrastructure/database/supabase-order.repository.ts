import { SupabaseClient } from '@supabase/supabase-js';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { Order } from '../../domain/entities/order.entity';
import { OrderStatus } from '../../domain/entities/order.entity';
import { databaseManager } from '../../config/database.config';

export class SupabaseOrderRepository implements OrderRepository {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = databaseManager.getSupabase();
  }

  async save(order: Order): Promise<void> {
    try {
      const orderData = {
        id: order.id,
        buyerId: order.buyerId,
        sellerId: order.sellerId,
        status: order.status as any,
        paymentMethod: order.paymentMethod as any,
        totalAmount: order.totalAmount.amount,
        currency: order.totalAmount.currency,
        totalWeight: order.totalWeight,
        deliveryAddress: {
          street: order.deliveryAddress.street,
          city: order.deliveryAddress.city,
          postalCode: order.deliveryAddress.postalCode,
          country: order.deliveryAddress.country
        } as any,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString()
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
        orderId: order.id,
        productId: item.productId,
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
        .eq('buyerId', buyerId)
        .order('createdAt', { ascending: false });

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
        buyerId: order.buyerId,
        sellerId: order.sellerId,
        status: order.status as any,
        paymentMethod: order.paymentMethod as any,
        totalAmount: order.totalAmount.amount,
        currency: order.totalAmount.currency,
        totalWeight: order.totalWeight,
        deliveryAddress: {
          street: order.deliveryAddress.street,
          city: order.deliveryAddress.city,
          postalCode: order.deliveryAddress.postalCode,
          country: order.deliveryAddress.country
        } as any,
        updatedAt: new Date().toISOString()
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
    const deliveryAddress = orderData.deliveryAddress as any;

    const orderDataForDomain = {
      id: orderData.id,
      buyerId: orderData.buyerId,
      sellerId: orderData.sellerId,
      items: orderData.items.map((item: any) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: { amount: Number(item.price), currency: item.currency },
        weight: item.weight
      })),
      totalAmount: Number(orderData.totalAmount),
      currency: orderData.currency,
      totalWeight: orderData.totalWeight,
      paymentMethod: orderData.paymentMethod as any,
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
    (order as any).createdAt = new Date(orderData.createdAt);
    (order as any).updatedAt = new Date(orderData.updatedAt);

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
        .order('createdAt', { ascending: false });

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
