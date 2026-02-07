
import { IOrderService } from '../../domain/interfaces/IOrderService';

export class OrderServiceAdapter implements IOrderService {
    async updateOrderStatus(orderId: string, status: string): Promise<void> {
        console.log(`[OrderAdapter] Updating order ${orderId} to status ${status}`);
    }

    async getOrderDetails(orderId: string): Promise<any> {
        console.log(`[OrderAdapter] Getting details for order ${orderId}`);
        return { id: orderId, products: [] };
    }
}
