import { UpdateProductionCapacity } from '../UpdateProductionCapacity';

const mockRepository = {
    getSnapshot: jest.fn(),
    updateSnapshot: jest.fn()
} as any;

const mockSaga = {
    adjustCapacity: jest.fn()
} as any;

describe('UpdateProductionCapacity', () => {
    let useCase: UpdateProductionCapacity;

    beforeEach(() => {
        jest.clearAllMocks();
        useCase = new UpdateProductionCapacity(mockRepository, mockSaga);
    });

    it('updates capacity and publishes an adjustment event', async () => {
        mockRepository.getSnapshot.mockResolvedValue({
            supplierId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
            date: '2026-03-23T00:00:00.000Z',
            maxCapacity: 10000,
            usedCapacity: 3500,
            reservedCapacity: 1500,
            availableCapacity: 5000,
            utilizationRate: 50,
            unit: 'units',
            updatedAt: '2026-03-23T08:00:00.000Z'
        });
        mockRepository.updateSnapshot.mockResolvedValue({
            supplierId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
            date: '2026-03-23T00:00:00.000Z',
            maxCapacity: 12000,
            usedCapacity: 3500,
            reservedCapacity: 1500,
            availableCapacity: 7000,
            utilizationRate: 41.67,
            unit: 'units',
            updatedAt: '2026-03-23T08:10:00.000Z'
        });

        const result = await useCase.execute({
            supplierId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
            maxCapacity: 12000,
            usedCapacity: 3500,
            reservedCapacity: 1500,
            unit: 'units',
            reason: 'Planner override',
            adjustedBy: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV'
        });

        expect(result.maxCapacity).toBe(12000);
        expect(mockSaga.adjustCapacity).toHaveBeenCalled();
    });
});
