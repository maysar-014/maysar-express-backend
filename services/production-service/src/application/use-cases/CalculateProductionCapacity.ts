
import { ProductionCapacity } from '../../domain/value-objects/production-capacity.value-object';

export class CalculateProductionCapacity {
    async execute(supplierId: string, date: Date): Promise<ProductionCapacity> {
        // Mock implementation
        return new ProductionCapacity({
            maxCapacity: 1000,
            usedCapacity: 500,
            reservedCapacity: 100,
            unit: 'units'
        });
    }
}
