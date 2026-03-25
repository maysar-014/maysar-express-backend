import { CapacitySnapshotResponseDto, UpdateProductionCapacityDto } from '../dto/capacity.dto';
import { ICapacityRepository } from '../interfaces/ICapacityRepository';
import { CapacityAdjustmentSaga } from '../sagas/CapacityAdjustmentSaga';

export class UpdateProductionCapacity {
    constructor(
        private readonly repository: ICapacityRepository,
        private readonly adjustmentSaga?: CapacityAdjustmentSaga
    ) { }

    async execute(input: UpdateProductionCapacityDto): Promise<CapacitySnapshotResponseDto> {
        const previousCapacity = await this.repository.getSnapshot(input.supplierId, input.date ? new Date(input.date) : undefined);
        const updatedCapacity = await this.repository.updateSnapshot(input);

        if (this.adjustmentSaga) {
            await this.adjustmentSaga.adjustCapacity({
                supplierId: input.supplierId,
                date: new Date(updatedCapacity.date),
                adjustedBy: input.adjustedBy,
                reason: input.reason,
                previousCapacity,
                currentCapacity: updatedCapacity
            });
        }

        return updatedCapacity;
    }
}
