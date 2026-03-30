
import { ProductionPlan } from '../entities/ProductionPlan.entity';
import { ProductionSchedulingAlgorithm } from '../algorithms/ProductionSchedulingAlgorithm';
import { CapacityManagementEngine } from './CapacityManagementEngine';
import { ProductionApprovalPolicy } from '../policies/ProductionApprovalPolicy';
import { ProductionCapacity } from '../value-objects/production-capacity.value-object';

export class ProductionPlanningEngine {
    constructor(
        private readonly schedulingAlgo: ProductionSchedulingAlgorithm = new ProductionSchedulingAlgorithm(),
        private readonly capacityEngine: CapacityManagementEngine = new CapacityManagementEngine(),
        private readonly approvalPolicy: ProductionApprovalPolicy = new ProductionApprovalPolicy()
    ) { }

    validatePlan(plan: ProductionPlan, capacity: ProductionCapacity): boolean {
        return this.approvalPolicy.canApprove(plan, capacity);
    }

    createPlan(input: { orderId: string; quantity: number }): { steps: Array<{ id: string; duration: number }> } {
        return {
            steps: [{
                id: input.orderId,
                duration: input.quantity
            }]
        };
    }

    optimizeSchedule(plan: ProductionPlan): void;
    optimizeSchedule(plan: Array<{ id: string; priority: number }>): Array<{ id: string; priority: number }>;
    optimizeSchedule(plan: ProductionPlan | Array<{ id: string; priority: number }>): Array<{ id: string; priority: number }> | void {
        if (Array.isArray(plan)) {
            return plan.map(item => ({ ...item }));
        }

        // Use schedulingAlgo
    }
}
