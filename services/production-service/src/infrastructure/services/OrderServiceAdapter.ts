
import { IOrderService } from '../../domain/interfaces/IOrderService';

export class OrderServiceAdapter implements IOrderService {
    async getOrder(id: string): Promise<any> {
        console.log(`[OrderAdapter] Getting order ${id}`);
        return { id, products: [] };
    }

    async updateOrderStatus(orderId: string, status: string): Promise<void> {
        console.log(`[OrderAdapter] Updating order ${orderId} to status ${status}`);
    }

    async getOrderDetails(orderId: string): Promise<any> {
        console.log(`[OrderAdapter] Getting details for order ${orderId}`);
        return { id: orderId, products: [] };
    }
}
