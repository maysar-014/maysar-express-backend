export interface IOrderService {
  getOrder(id: string): Promise<any>;
  updateOrderStatus(orderId: string, status: string): Promise<void>;
}
