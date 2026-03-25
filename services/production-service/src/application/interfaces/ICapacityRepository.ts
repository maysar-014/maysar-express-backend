import { CapacitySnapshotResponseDto, UpdateProductionCapacityDto } from '../dto/capacity.dto';

export interface ICapacityRepository {
    getSnapshot(supplierId: string, date?: Date): Promise<CapacitySnapshotResponseDto>;
    updateSnapshot(input: UpdateProductionCapacityDto): Promise<CapacitySnapshotResponseDto>;
}
