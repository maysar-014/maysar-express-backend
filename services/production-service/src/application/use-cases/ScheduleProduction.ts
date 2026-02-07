
import { ProductionSchedulingAlgorithm } from '../../domain/algorithms/ProductionSchedulingAlgorithm';
import { IProductionOrderRepository } from '../../domain/interfaces/IProductionOrderRepository';

export class ScheduleProduction {
    constructor(
        private readonly orderRepo: IProductionOrderRepository,
        private readonly scheduler: ProductionSchedulingAlgorithm
    ) { }

    async execute(planId: string): Promise<void> {
        const orders = await this.orderRepo.findByPlanId(planId);
        if (!orders.length) return;

        const sequence = this.scheduler.optimizeSequence(orders);

        // Update orders with new sequence/times
        // await Promise.all(sequence.map(order => this.orderRepo.save(order)));
    }
}
