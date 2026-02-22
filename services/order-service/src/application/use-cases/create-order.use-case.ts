export class CreateOrderUseCase {
    constructor(
        private readonly repository: any,
        private readonly eventBus: any
    ) {}

    async execute(dto: { userId: string; items: any[]; total: number }) {
        if (!dto.items || dto.items.length === 0) {
            throw new Error('Order must have items');
        }

        const order = { id: `order-${Date.now()}`, ...dto, status: 'PENDING' };
        await this.repository.save(order);
        await this.eventBus.publish('OrderCreated.v1', order);
        return order;
    }
}
