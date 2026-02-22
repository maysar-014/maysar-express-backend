export class CancelOrderUseCase {
    constructor(
        private readonly repository: any,
        private readonly eventBus: any
    ) {}

    async execute(dto: { orderId: string; userId: string; reason: string }) {
        const order = await this.repository.findById(dto.orderId);
        if (!order) throw new Error('Order not found');
        if (order.status === 'SHIPPED') throw new Error('Cannot cancel shipped order');

        order.status = 'CANCELLED';
        order.cancelReason = dto.reason;
        await this.repository.update(order);
        await this.eventBus.publish('OrderCancelled.v1', order);
        return order;
    }
}
