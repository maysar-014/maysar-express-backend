
import { IProductionOrderRepository } from '../../domain/interfaces/IProductionOrderRepository';
import { IInventoryService } from '../../domain/interfaces/IInventoryService';
import { IEventBus } from '../../domain/interfaces/IEventBus';
import { ProductionOrderStatus } from '../../domain/entities/ProductionOrder.entity';

export class CompleteProduction {
    constructor(
        private readonly orderRepo: IProductionOrderRepository,
        private readonly inventoryService: IInventoryService,
        private readonly eventBus: IEventBus
    ) { }

    async execute(orderId: string, producedQty: number, defectedQty: number): Promise<void> {
        const order = await this.orderRepo.findById(orderId);
        if (!order) throw new Error('Order not found');

        order.completeProduction(producedQty, defectedQty);
        await this.orderRepo.save(order);

        await this.inventoryService.updateStock(order.productId, producedQty, 'IN');

        await this.eventBus.publish({
            type: 'ProductionCompleted',
            payload: { orderId, producedQty, defectedQty }
        });
    }
}
