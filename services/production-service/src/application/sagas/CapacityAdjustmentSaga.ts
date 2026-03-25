
import { CapacityManagementEngine } from '../../domain/engines/CapacityManagementEngine';
import { IEventBus } from '../../domain/interfaces/IEventBus';
import { CapacitySnapshotResponseDto } from '../dto/capacity.dto';

export interface CapacityAdjustmentPayload {
    supplierId: string;
    date: Date;
    adjustedBy?: string;
    reason?: string;
    previousCapacity?: CapacitySnapshotResponseDto | null;
    currentCapacity: CapacitySnapshotResponseDto;
}

export class CapacityAdjustmentSaga {
    constructor(
        private readonly capacityEngine: CapacityManagementEngine,
        private readonly eventBus: IEventBus
    ) { }

    async adjustCapacity(payload: CapacityAdjustmentPayload): Promise<void> {
        await this.eventBus.publish({
            type: 'CapacityUpdated',
            payload
        });
    }
}
