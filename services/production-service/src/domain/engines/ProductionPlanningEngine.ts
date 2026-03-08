
import { ProductionPlan } from '../entities/ProductionPlan.entity';
import { ProductionSchedulingAlgorithm } from '../algorithms/ProductionSchedulingAlgorithm';
import { CapacityManagementEngine } from './CapacityManagementEngine';
import { ProductionApprovalPolicy } from '../policies/ProductionApprovalPolicy';
import { ProductionCapacity } from '../value-objects/production-capacity.value-object';

export class ProductionPlanningEngine {
    constructor(
        private readonly schedulingAlgo: ProductionSchedulingAlgorithm,
        private readonly capacityEngine: CapacityManagementEngine,
        private readonly approvalPolicy: ProductionApprovalPolicy
    ) { }

    validatePlan(plan: ProductionPlan, capacity: ProductionCapacity): boolean {
        return this.approvalPolicy.canApprove(plan, capacity);
    }

    optimizeSchedule(plan: ProductionPlan): void {
        // Use schedulingAlgo
    }
}
