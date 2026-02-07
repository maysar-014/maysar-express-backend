
import { IProductionOrderRepository } from '../../domain/interfaces/IProductionOrderRepository';

export class TrackProductionProgress {
    constructor(private readonly orderRepo: IProductionOrderRepository) { }

    async execute(orderId: string): Promise<any> {
        const order = await this.orderRepo.findById(orderId);
        if (!order) throw new Error('Order not found');

        return {
            produced: order.producedQty || 0, // Accessing private props via getter if exists, or direct if permitted
            status: order.status,
            phase: order.phase
        };
    }
}
