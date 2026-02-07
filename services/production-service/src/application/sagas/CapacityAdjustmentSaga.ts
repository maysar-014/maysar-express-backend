
import { CapacityManagementEngine } from '../../domain/engines/CapacityManagementEngine';
import { IEventBus } from '../../domain/interfaces/IEventBus';

export class CapacityAdjustmentSaga {
    constructor(
        private readonly capacityEngine: CapacityManagementEngine,
        private readonly eventBus: IEventBus
    ) { }

    async adjustCapacity(supplierId: string, date: Date, adjustment: number): Promise<void> {
        // 1. Validate if adjustment is possible (not already over-allocated)
        // 2. Update capacity
        // 3. Reschedule affected orders if capacity reduced

        await this.eventBus.publish({
            type: 'CapacityUpdated',
            payload: { supplierId, date, adjustment }
        });
    }
}
