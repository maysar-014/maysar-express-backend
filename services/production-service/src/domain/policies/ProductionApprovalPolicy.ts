
import { ProductionPlan, ProductionStatus } from '../entities/ProductionPlan.entity';
import { ProductionCapacity } from '../value-objects/production-capacity.value-object';

export interface LegacyProductionApprovalInput {
    qualityPassed: boolean;
    resourcesAvailable: boolean;
}

export class ProductionApprovalPolicy {
    canApprove(plan: ProductionPlan | LegacyProductionApprovalInput, capacity?: ProductionCapacity): boolean {
        if (!capacity && this.isLegacyInput(plan)) {
            return plan.qualityPassed && plan.resourcesAvailable;
        }

        const typedPlan = plan as ProductionPlan;
        const typedCapacity = capacity as ProductionCapacity;

        if (typedPlan.status !== ProductionStatus.DRAFT) {
            return false;
        }

        if (!typedCapacity.isAvailable(typedPlan.targetQuantity)) {
            return false;
        }

        // Add more complex business rules here, e.g., credit check, supplier rating
        return true;
    }

    private isLegacyInput(value: ProductionPlan | LegacyProductionApprovalInput): value is LegacyProductionApprovalInput {
        return typeof (value as LegacyProductionApprovalInput).qualityPassed === 'boolean'
            && typeof (value as LegacyProductionApprovalInput).resourcesAvailable === 'boolean';
    }
}
