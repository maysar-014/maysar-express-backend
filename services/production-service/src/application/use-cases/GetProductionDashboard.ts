
import { IProductionRepository } from '../../domain/interfaces/IProductionRepository';
import { IProductionOrderRepository } from '../../domain/interfaces/IProductionOrderRepository';

export class GetProductionDashboard {
    constructor(
        private readonly planRepo: IProductionRepository,
        private readonly orderRepo: IProductionOrderRepository
    ) { }

    async execute(supplierId: string): Promise<any> {
        const plans = await this.planRepo.findBySupplierId(supplierId);
        // Aggregate metrics, upcoming schedules
        return {
            activePlans: plans.length,
            // ...
        };
    }
}
