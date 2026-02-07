
import { IProductionRepository } from '../../domain/interfaces/IProductionRepository';
import { ProductionStatus } from '../../domain/entities/ProductionPlan.entity';

export class UpdateProductionStatus {
    constructor(private readonly repo: IProductionRepository) { }

    async execute(planId: string, status: ProductionStatus): Promise<void> {
        const plan = await this.repo.findById(planId);
        if (!plan) throw new Error('Plan not found');

        plan.updateStatus(status);
        await this.repo.save(plan);
    }
}
