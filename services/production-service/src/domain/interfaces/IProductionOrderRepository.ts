
import { ProductionOrder } from '../entities/ProductionOrder.entity';

export interface IProductionOrderRepository {
    save(order: ProductionOrder): Promise<ProductionOrder>;
    findById(id: string): Promise<ProductionOrder | null>;
    findByPlanId(planId: string): Promise<ProductionOrder[]>;
    updateStatus(id: string, status: string): Promise<void>;
}
