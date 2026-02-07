
import { ProductionPriority } from '../entities/ProductionPlan.entity';

export class CapacityAllocationPolicy {
    shouldAllocate(priority: ProductionPriority, utilizationRate: number): boolean {
        // Critical orders can always be allocated if there is any capacity
        if (priority === ProductionPriority.CRITICAL) {
            return true;
        }

        // High priority orders can be allocated up to 95% utilization
        if (priority === ProductionPriority.HIGH && utilizationRate < 95) {
            return true;
        }

        // Medium priority orders up to 90%
        if (priority === ProductionPriority.MEDIUM && utilizationRate < 90) {
            return true;
        }

        // Low priority orders only if utilization is below 80%
        if (priority === ProductionPriority.LOW && utilizationRate < 80) {
            return true;
        }

        return false;
    }
}
