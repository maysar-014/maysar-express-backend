
export interface IOrderService {
    updateOrderStatus(orderId: string, status: string): Promise<void>;
    getOrderDetails(orderId: string): Promise<any>;
}
