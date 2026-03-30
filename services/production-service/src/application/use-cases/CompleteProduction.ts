
import { IProductionOrderRepository } from '../../domain/interfaces/IProductionOrderRepository';
import { IInventoryService } from '../../domain/interfaces/IInventoryService';
import { IEventBus } from '../../domain/interfaces/IEventBus';
import { ProductionOrderStatus } from '../../domain/entities/ProductionOrder.entity';

export class CompleteProduction {
    constructor(
        private readonly orderRepo: IProductionOrderRepository,
        private readonly inventoryService?: IInventoryService,
        private readonly eventBus?: IEventBus
    ) { }

    async execute(orderId: string, producedQty = 0, defectedQty = 0): Promise<void> {
        const order = await this.orderRepo.findById(orderId);
        if (!order) throw new Error('Order not found');

        if (typeof (order as any).completeProduction === 'function') {
            (order as any).completeProduction(producedQty, defectedQty);
        } else if (typeof (order as any).complete === 'function') {
            (order as any).complete(producedQty, defectedQty);
        }

        if (typeof (this.orderRepo as any).save === 'function') {
            await (this.orderRepo as any).save(order);
        } else if (typeof (this.orderRepo as any).update === 'function') {
            await (this.orderRepo as any).update(order);
        }

        await this.inventoryService?.updateStock(order.productId, producedQty, 'IN');

        await this.eventBus?.publish({
            type: 'ProductionCompleted',
            payload: { orderId, producedQty, defectedQty }
        });
    }
}
