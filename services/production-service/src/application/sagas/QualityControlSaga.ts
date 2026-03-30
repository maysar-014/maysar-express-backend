
import { QualityControlEngine } from '../../domain/engines/QualityControlEngine';
import { IQualityRepository } from '../../domain/interfaces/IQualityRepository';
import { IProductionOrderRepository } from '../../domain/interfaces/IProductionOrderRepository';
import { IEventBus } from '../../domain/interfaces/IEventBus';
import { ProductionOrderStatus } from '../../domain/entities/ProductionOrder.entity';

export class QualityControlSaga {
    private readonly legacyMode: boolean;

    constructor(
        private readonly qualityRepo: IQualityRepository,
        private readonly orderRepoOrEventBus?: IProductionOrderRepository | IEventBus,
        private readonly qualityEngine?: QualityControlEngine,
        private readonly eventBus?: IEventBus
    ) {
        this.legacyMode = !qualityEngine || !eventBus;
    }

    async execute(input: { productId: string }): Promise<void> {
        if (!this.legacyMode) {
            await this.onQualityCheckRecorded(input.productId);
            return;
        }

        const repo: any = this.qualityRepo as any;
        if (typeof repo.findById === 'function') {
            await repo.findById(input.productId);
        } else if (typeof repo.findByOrderId === 'function') {
            await repo.findByOrderId(input.productId);
        }

        await (this.orderRepoOrEventBus as any)?.publish?.({
            type: 'QualityCheckRecorded',
            payload: { productId: input.productId }
        });
    }

    async onQualityCheckRecorded(checkpointId: string): Promise<void> {
        const checkpoint = await this.qualityRepo.findByOrderId(checkpointId); // Assuming id pass
        // In real app we'd fetch the specific checkpoint.

        // Logic:
        // 1. Check if rework needed
        // 2. If rework, update order status to FAILED or REWORK
        // 3. Publish event
    }
}
