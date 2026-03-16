
import { ProductionCapacity } from '../../domain/value-objects/production-capacity.value-object';

export class CalculateProductionCapacity {
    async execute(supplierId: string, date: Date): Promise<ProductionCapacity> {
        throw new Error('Production capacity calculation is not implemented.');
    }
}
