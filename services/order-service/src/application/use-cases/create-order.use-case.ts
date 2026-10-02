import { IdGeneratorService } from '../../infrastructure/services/id-generator.service';
import { assertMinimumBasketValue } from '@shared/business/minimum-basket-value';

export class CreateOrderUseCase {
    constructor(
        private readonly repository: any,
        private readonly eventBus: any
    ) {}

    async execute(dto: { userId: string; items: any[]; total: number; enablerId?: string; enablerCode?: string }) {
    if (!dto.items || dto.items.length === 0) {
      throw new Error('Order must have items');
    }

    assertMinimumBasketValue(dto.total);

    const order = {
            id: IdGeneratorService.generateOrderId(),
            ...dto,
            status: 'PENDING'
        };
        await this.repository.save(order);
        await this.eventBus.publish('OrderCreated.v1', order);
        return order;
    }
}
