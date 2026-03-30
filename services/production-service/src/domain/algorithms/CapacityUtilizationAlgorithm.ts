
import { ProductionCapacity } from '../value-objects/production-capacity.value-object';

export class CapacityUtilizationAlgorithm {
    calculate(input: { used: number; total: number }): number {
        if (!input.total) return 0;
        return (input.used / input.total) * 100;
    }

    calculateProjected(currentCapacity: ProductionCapacity, pendingOrdersB: number): number {
        const totalPotentialUsage = currentCapacity.usedCapacity + currentCapacity.reservedCapacity + pendingOrdersB;
        if (currentCapacity.maxCapacity === 0) return 0;

        return (totalPotentialUsage / currentCapacity.maxCapacity) * 100;
    }
}
