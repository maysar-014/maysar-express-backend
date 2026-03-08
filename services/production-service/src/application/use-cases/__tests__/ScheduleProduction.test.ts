import { ScheduleProduction } from '../ScheduleProduction';

const mockRepository = { findByPlanId: jest.fn() } as any;
const mockAlgorithm = { optimizeSequence: jest.fn() } as any;

describe('ScheduleProduction', () => {
    let useCase: ScheduleProduction;

    beforeEach(() => {
        jest.clearAllMocks();
        useCase = new ScheduleProduction(mockRepository, mockAlgorithm);
    });

    it('should schedule production', async () => {
        mockRepository.findByPlanId.mockResolvedValue([{ id: 'o1' }]);
        mockAlgorithm.optimizeSequence.mockReturnValue([{ id: 'o1', startTime: new Date() }]);
        await useCase.execute('plan1');
        expect(mockAlgorithm.optimizeSequence).toHaveBeenCalled();
    });
});
