import { CapacityAdjustmentSaga } from '../CapacityAdjustmentSaga';

const mockCapacityEngine = {} as any;
const mockEventBus = { publish: jest.fn() } as any;

describe('CapacityAdjustmentSaga', () => {
    let saga: CapacityAdjustmentSaga;

    beforeEach(() => {
        jest.clearAllMocks();
        saga = new CapacityAdjustmentSaga(mockCapacityEngine, mockEventBus);
    });

    it('publishes a capacity-updated event', async () => {
        await saga.adjustCapacity({
            supplierId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
            date: new Date('2026-03-23T00:00:00.000Z'),
            adjustedBy: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
            reason: 'Planner override',
            currentCapacity: {
                supplierId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
                date: '2026-03-23T00:00:00.000Z',
                maxCapacity: 12000,
                usedCapacity: 3500,
                reservedCapacity: 1500,
                availableCapacity: 7000,
                utilizationRate: 41.67,
                unit: 'units',
                updatedAt: '2026-03-23T08:10:00.000Z'
            }
        });

        expect(mockEventBus.publish).toHaveBeenCalled();
    });
});
