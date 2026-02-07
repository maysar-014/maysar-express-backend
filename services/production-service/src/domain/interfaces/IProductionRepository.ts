
import { ProductionPlan } from '../entities/ProductionPlan.entity';

export interface IProductionRepository {
    save(plan: ProductionPlan): Promise<ProductionPlan>;
    findById(id: string): Promise<ProductionPlan | null>;
    findBySupplierId(supplierId: string): Promise<ProductionPlan[]>;
    updateStatus(id: string, status: string): Promise<void>;
    delete(id: string): Promise<void>;
}
