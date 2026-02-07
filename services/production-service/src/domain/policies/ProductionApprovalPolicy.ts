
import { ProductionPlan, ProductionStatus } from '../entities/ProductionPlan.entity';
import { ProductionCapacity } from '../value-objects/production-capacity.value-object';

export class ProductionApprovalPolicy {
    canApprove(plan: ProductionPlan, capacity: ProductionCapacity): boolean {
        if (plan.status !== ProductionStatus.DRAFT) {
            return false;
        }

        if (!capacity.isAvailable(plan.targetQuantity)) {
            return false;
        }

        // Add more complex business rules here, e.g., credit check, supplier rating
        return true;
    }
}
