import { CalculateProductionCapacity } from '../CalculateProductionCapacity';

const mockRepository = { getSnapshot: jest.fn() } as any;

describe('CalculateProductionCapacity', () => {
    let useCase: CalculateProductionCapacity;

    beforeEach(() => {
        jest.clearAllMocks();
        useCase = new CalculateProductionCapacity(mockRepository);
    });

    it('should fetch supplier capacity from the repository', async () => {
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

        const result = await useCase.execute('usr_01ARZ3NDEKTSV4RRFFQ69G5FAV', new Date('2026-03-23T00:00:00.000Z'));

        expect(mockRepository.getSnapshot).toHaveBeenCalledWith(
            'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
            new Date('2026-03-23T00:00:00.000Z')
        );
        expect(result.availableCapacity).toBe(5000);
    });
});
