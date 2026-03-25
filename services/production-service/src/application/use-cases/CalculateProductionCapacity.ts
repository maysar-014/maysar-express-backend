
import { CapacitySnapshotResponseDto } from '../dto/capacity.dto';
import { ICapacityRepository } from '../interfaces/ICapacityRepository';

export class CalculateProductionCapacity {
    constructor(private readonly repository: ICapacityRepository) { }

    async execute(supplierId: string, date: Date): Promise<CapacitySnapshotResponseDto> {
        return this.repository.getSnapshot(supplierId, date);
    }
}
