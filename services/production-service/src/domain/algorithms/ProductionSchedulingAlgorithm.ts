
import { ProductionOrder, ProductionOrderStatus } from '../entities/ProductionOrder.entity';
import { ProductionPriority } from '../entities/ProductionPlan.entity'; // Assuming priority is on order too or derived

export class ProductionSchedulingAlgorithm {
    optimizeSequence(orders: ProductionOrder[]): ProductionOrder[] {
        throw new Error('Production scheduling optimization is not implemented.');
    }
}
