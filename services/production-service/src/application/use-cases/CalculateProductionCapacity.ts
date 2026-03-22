
import { ProductionCapacity } from '../../domain/value-objects/production-capacity.value-object';

export class CalculateProductionCapacity {
    async execute(_supplierId: string, _date: Date): Promise<ProductionCapacity> {
        // Graceful fallback until full capacity engine wiring is completed.
        return new ProductionCapacity({
            maxCapacity: 0,
            usedCapacity: 0,
            reservedCapacity: 0,
            unit: 'units'
        });
    }
}
