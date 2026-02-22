import { ScheduleProduction } from '../ScheduleProduction';

const mockRepository = { findById: jest.fn(), update: jest.fn() } as any;
const mockAlgorithm = { schedule: jest.fn() } as any;

describe('ScheduleProduction', () => {
    let useCase: ScheduleProduction;

    beforeEach(() => {
        jest.clearAllMocks();
        useCase = new ScheduleProduction(mockRepository, mockAlgorithm);
    });

    it('should schedule production', async () => {
        mockAlgorithm.schedule.mockReturnValue([{ id: 'p1', startTime: new Date() }]);
        const result = await useCase.execute({ planId: 'plan1' });
        expect(result.length).toBeGreaterThan(0);
    });
});
