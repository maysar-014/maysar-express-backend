
import { ProductionCapacity } from '../value-objects/production-capacity.value-object';
import { CapacityAllocationPolicy } from '../policies/CapacityAllocationPolicy';
import { CapacityUtilizationAlgorithm } from '../algorithms/CapacityUtilizationAlgorithm';
import { ProductionPriority } from '../entities/ProductionPlan.entity';

export class CapacityManagementEngine {
    constructor(
        private readonly allocationPolicy: CapacityAllocationPolicy,
        private readonly utilizationAlgo: CapacityUtilizationAlgorithm
    ) { }

    canAllocate(capacity: ProductionCapacity, amount: number, priority: ProductionPriority): boolean {
        const projectedUtilization = this.utilizationAlgo.calculateProjected(capacity, amount);
        return this.allocationPolicy.shouldAllocate(priority, projectedUtilization) && capacity.isAvailable(amount);
    }

    detectBottlenecks(capacities: ProductionCapacity[]): Date[] {
        throw new Error('Capacity bottleneck detection is not implemented.');
    }
}
