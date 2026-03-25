import { CancellationPolicy, CancellationRequester } from '../../domain/policies/cancellation.policy';

export class CancelOrderUseCase {
    constructor(
        private readonly repository: any,
        private readonly eventBus: any,
        private readonly cancellationPolicy: CancellationPolicy = new CancellationPolicy()
    ) {}

    async execute(dto: { orderId: string; userId: string; reason: string; requestedBy?: CancellationRequester }) {
        const order = await this.repository.findById(dto.orderId);
        if (!order) throw new Error('Order not found');

        const decision = this.cancellationPolicy.canCancelOrder({
            order,
            requestedBy: dto.requestedBy || 'buyer',
            requesterUserId: dto.userId
        });

        if (!decision.allowed) {
            throw new Error(decision.reason || 'Order cannot be cancelled');
        }

        order.status = 'CANCELLED';
        order.cancelReason = dto.reason;
        order.cancelledAt = new Date();
        await this.repository.update(order);
        await this.eventBus.publish('OrderCancelled.v1', order);
        return order;
    }
}
