
import { ProductionCapacity } from '../value-objects/production-capacity.value-object';
import { CapacityAllocationPolicy } from '../policies/CapacityAllocationPolicy';
import { CapacityUtilizationAlgorithm } from '../algorithms/CapacityUtilizationAlgorithm';
import { ProductionPriority } from '../entities/ProductionPlan.entity';

export class CapacityManagementEngine {
    constructor(
        private readonly allocationPolicy: CapacityAllocationPolicy = new CapacityAllocationPolicy(),
        private readonly utilizationAlgo: CapacityUtilizationAlgorithm = new CapacityUtilizationAlgorithm()
    ) { }

    canAllocate(capacity: ProductionCapacity, amount: number, priority: ProductionPriority): boolean {
        const projectedUtilization = this.utilizationAlgo.calculateProjected(capacity, amount);
        return this.allocationPolicy.shouldAllocate(priority, projectedUtilization) && capacity.isAvailable(amount);
    }

    calculateCapacity(input: { resources: unknown[]; timeframe: string }): { available: number; utilization: number } {
        return {
            available: Math.max(0, 100 - (input.resources?.length ?? 0)),
            utilization: input.resources?.length ?? 0
        };
    }

    detectBottlenecks(capacities: ProductionCapacity[]): Date[] {
        throw new Error('Capacity bottleneck detection is not implemented.');
    }
}
